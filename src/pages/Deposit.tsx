import { ChainId, POOLS_MAP, PoolName, Token } from "../constants"
import { DepositTransaction, TransactionItem } from "../interfaces/transactions"
import React, { ReactElement, useEffect, useState } from "react"
import { TokensStateType, useTokenFormState } from "../hooks/useTokenFormState"
import { formatBNToString, shiftBNDecimals } from "../utils"
import usePoolData, { PoolDataType } from "../hooks/usePoolData"

import { AppState } from "../state"
import { BigNumber } from "@ethersproject/bignumber"
import DepositPage from "../components/DepositPage"
import { TokenPricesUSD } from "../state/application"
import { Zero } from "@ethersproject/constants"
import { calculatePriceImpact } from "../utils/priceImpact"
import { parseUnits } from "@ethersproject/units"
import { useActiveWeb3React } from "../hooks"
import { useApproveAndDeposit } from "../hooks/useApproveAndDeposit"
import { useLocation } from "react-router-dom"
import { usePoolTokenBalances } from "../state/wallet/hooks"
import { useSelector } from "react-redux"
import { useSwapContract } from "../hooks/useContract"

interface LocationState {
  state: { poolName: PoolName }
}

function Deposit(): ReactElement {
  const {
    state: { poolName },
  }: LocationState = useLocation()
  const POOL = POOLS_MAP[poolName]
  const { account, chainId } = useActiveWeb3React()
  const approveAndDeposit = useApproveAndDeposit(poolName)
  const [poolData, userShareData] = usePoolData(poolName)
  const swapContract = useSwapContract(poolName)
  const [tokenFormState, updateTokenFormState] = useTokenFormState(
    POOL.poolTokens,
  )
  const tokenBalances = usePoolTokenBalances()
  const { tokenPricesUSD } = useSelector((state: AppState) => state.application)
  const [estDepositLPTokenAmount, setEstDepositLPTokenAmount] = useState(Zero)
  const [priceImpact, setPriceImpact] = useState(Zero)

  useEffect(() => {
    // evaluate if a new deposit will exceed the pool's per-user limit
    async function calculateMaxDeposits(): Promise<void> {
      if (
        swapContract == null ||
        userShareData == null ||
        poolData == null ||
        account == null
      ) {
        setEstDepositLPTokenAmount(Zero)
        return
      }
      const tokenInputSum = parseUnits(
        POOL.poolTokens
          .reduce(
            (sum, { symbol }) =>
              sum +
              (symbol == "mYAK"
                ? Number(tokenFormState[symbol].valueRaw) / 1000000
                : Number(tokenFormState[symbol].valueRaw) || 0),
            0,
          )
          .toFixed(18),
        18,
      )
      let depositLPTokenAmount
      if (poolData.totalLocked.gt(0) && tokenInputSum.gt(0)) {
        depositLPTokenAmount = await swapContract.calculateTokenAmount(
          account,
          POOL.poolTokens.map(({ symbol }) => tokenFormState[symbol].valueSafe),
          true, // deposit boolean
        )
      } else {
        // when pool is empty, estimate the lptokens by just summing the input instead of calling contract
        depositLPTokenAmount = tokenInputSum
      }
      setEstDepositLPTokenAmount(depositLPTokenAmount)

      setPriceImpact(
        calculatePriceImpact(
          tokenInputSum,
          depositLPTokenAmount,
          poolData.virtualPrice,
        ),
      )
    }
    void calculateMaxDeposits()
  }, [
    poolData,
    tokenFormState,
    swapContract,
    userShareData,
    account,
    POOL.poolTokens,
  ])

  // A represention of tokens used for UI
  const tokens = POOL.poolTokens.map(({ symbol, name, icon, decimals }) => ({
    symbol,
    name,
    icon,
    max: formatBNToString(
      tokenBalances?.[symbol] || Zero,
      decimals[chainId || ChainId["FUJI"]],
    ),
    inputValue: tokenFormState[symbol].valueRaw,
  }))

  const exceedsWallet = POOL.poolTokens.some(({ symbol }) => {
    const exceedsBoolean = (tokenBalances?.[symbol] || Zero).lt(
      BigNumber.from(tokenFormState[symbol].valueSafe),
    )
    return exceedsBoolean
  })

  async function onConfirmTransaction(): Promise<void> {
    await approveAndDeposit(tokenFormState)
    // Clear input after deposit
    updateTokenFormState(
      POOL.poolTokens.reduce(
        (acc, t) => ({
          ...acc,
          [t.symbol]: "",
        }),
        {},
      ),
    )
  }
  function updateTokenFormValue(symbol: string, value: string): void {
    updateTokenFormState({ [symbol]: value })
  }
  const depositTransaction = buildTransactionData(
    chainId || ChainId["FUJI"],
    tokenFormState,
    poolData,
    POOL.poolTokens,
    POOL.lpToken,
    priceImpact,
    estDepositLPTokenAmount,
    tokenPricesUSD,
  )

  return (
    <DepositPage
      onConfirmTransaction={onConfirmTransaction}
      onChangeTokenInputValue={updateTokenFormValue}
      title={poolName}
      tokens={tokens}
      exceedsWallet={exceedsWallet}
      poolData={poolData}
      myShareData={userShareData}
      transactionData={depositTransaction}
    />
  )
}

function buildTransactionData(
  chainId: ChainId,
  tokenFormState: TokensStateType,
  poolData: PoolDataType | null,
  poolTokens: Token[],
  poolLpToken: Token,
  priceImpact: BigNumber,
  estDepositLPTokenAmount: BigNumber,
  tokenPricesUSD?: TokenPricesUSD,
): DepositTransaction {
  const from = {
    items: [] as TransactionItem[],
    totalAmount: Zero,
    totalValueUSD: Zero,
  }
  const TOTAL_AMOUNT_DECIMALS = 18
  let isImbalance = false
  let firstAmount: BigNumber

  poolTokens.forEach((token) => {
    const { symbol, decimals } = token
    const amount = BigNumber.from(tokenFormState[symbol].valueSafe)
    const usdPriceBN = parseUnits(
      (tokenPricesUSD?.[symbol] || 0).toFixed(2),
      18,
    )

    const valueUSD = amount
      .mul(usdPriceBN)
      .div(BigNumber.from(10).pow(decimals[chainId || ChainId["FUJI"]]))

    if (!firstAmount) {
      firstAmount = valueUSD
    } else {
      const diff = firstAmount.sub(valueUSD).abs()
      if (diff.mul(10).gt(firstAmount)) {
        isImbalance = true
      }
    }

    if (amount.lte("0")) return

    const item = {
      token,
      amount,
      singleTokenPriceUSD: usdPriceBN,
      valueUSD,
    }
    from.items.push(item)
    from.totalAmount = from.totalAmount.add(
      shiftBNDecimals(
        amount,
        TOTAL_AMOUNT_DECIMALS - decimals[chainId || ChainId["FUJI"]],
      ),
    )
    from.totalValueUSD = from.totalValueUSD.add(usdPriceBN)
  })

  const lpTokenPriceUSD = poolData?.lpTokenPriceUSD || Zero
  const toTotalValueUSD = estDepositLPTokenAmount
    .mul(lpTokenPriceUSD)
    ?.div(
      BigNumber.from(10).pow(poolLpToken.decimals[chainId || ChainId["FUJI"]]),
    )
  const to = {
    item: {
      token: poolLpToken,
      amount: estDepositLPTokenAmount,
      singleTokenPriceUSD: lpTokenPriceUSD,
      valueUSD: toTotalValueUSD,
    },
    totalAmount: estDepositLPTokenAmount,
    totalValueUSD: toTotalValueUSD,
  }
  const shareOfPool = poolData?.totalLocked.gt(0)
    ? estDepositLPTokenAmount
        .mul(BigNumber.from(10).pow(18))
        .div(estDepositLPTokenAmount.add(poolData?.totalLocked))
    : BigNumber.from(10).pow(18)
  return {
    from,
    to,
    priceImpact,
    shareOfPool,
    isImbalance,
  }
}

export default Deposit
