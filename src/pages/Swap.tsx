import {
  ChainId,
  IS_VIRTUAL_SWAP_ACTIVE,
  POOLS_MAP,
  PoolName,
  SWAP_TYPES,
  SwapData,
  SwapSide,
  TOKENS_MAP,
} from "../constants"
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  calculateExchangeRate,
  calculatePrice,
  shiftBNDecimals,
} from "../utils"
import { formatUnits, parseUnits } from "@ethersproject/units"

import { AppState } from "../state/index"
import { BigNumber } from "@ethersproject/bignumber"
import SwapPage from "../components/SwapPage"
import { Zero } from "@ethersproject/constants"
import { calculateGasEstimate } from "../utils/gasEstimate"
import { calculatePriceImpact } from "../utils/priceImpact"
import { debounce } from "lodash"
import { formatGasToString } from "../utils/gas"
import { useActiveWeb3React } from "../hooks"
import { useApproveAndSwap } from "../hooks/useApproveAndSwap"
import usePoolData from "../hooks/usePoolData"
import { usePoolTokenBalances } from "../state/wallet/hooks"
import { useSelector } from "react-redux"
import { useSwapContract } from "../hooks/useContract"
import { useTranslation } from "react-i18next"

type FormState = {
  error: null | string
  from: {
    value: string
    valueUSD: BigNumber
  } & SwapSide
  to: {
    value: BigNumber
    valueUSD: BigNumber
    valueSynth: BigNumber
  } & SwapSide
  priceImpact: BigNumber
  exchangeRate: BigNumber
  route: string[]
  swapType: SWAP_TYPES
  currentSwapPairs: SwapData[]
}

export interface TokenOption {
  symbol: string
  name: string
  valueUSD: BigNumber
  amount: BigNumber
  icon: string
  decimals: number
  swapType: SWAP_TYPES | null
  isAvailable: boolean
}

const EMPTY_FORM_STATE = {
  error: null,
  from: {
    symbol: "",
    value: "0.0",
    valueUSD: Zero,
  },
  to: {
    symbol: "",
    value: Zero,
    valueUSD: Zero,
    valueSynth: Zero,
  },
  priceImpact: Zero,
  exchangeRate: Zero,
  route: [],
  swapType: SWAP_TYPES.INVALID,
  currentSwapPairs: [],
}

function Swaps(): ReactElement {
  const { t } = useTranslation()
  const { chainId } = useActiveWeb3React()
  const tokenBalances = usePoolTokenBalances()
  const { tokenPricesUSD, gasStandard, gasFast, gasInstant } = useSelector(
    (state: AppState) => state.application,
  )
  const { gasPriceSelected, gasCustom } = useSelector(
    (state: AppState) => state.user,
  )
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM_STATE)
  const [prevFormState, setPrevFormState] =
    useState<FormState>(EMPTY_FORM_STATE)
  const swapContract = useSwapContract(formState.to.poolName as PoolName)
  const approveAndSwap = useApproveAndSwap(formState.to.poolName as PoolName)
  const [poolData] = usePoolData(formState.to.poolName as PoolName)
  const POOL = POOLS_MAP[formState.to.poolName as PoolName]

  const tokenOptions = useMemo(() => {
    const allTokens = Object.values(TOKENS_MAP)
      .filter(({ symbol }) => {
        if (symbol.indexOf(" LP") > -1 || symbol.indexOf("GDL") > -1) {
          return false
        }
        return true
      })
      .map(({ symbol, name, icon, decimals }) => {
        const amount = tokenBalances?.[symbol] || Zero
        return {
          name,
          icon,
          symbol,
          decimals: decimals[chainId || ChainId["FUJI"]],
          amount,
          valueUSD: calculatePrice(
            amount,
            tokenPricesUSD?.[symbol],
            decimals[chainId || ChainId["FUJI"]],
          ),
          isAvailable: true,
          swapType: null,
        }
      })
      .sort(sortTokenOptions)
    const toTokens =
      formState.currentSwapPairs.length > 0
        ? formState.currentSwapPairs
            .map(({ to, type: swapType }) => {
              const { symbol, name, icon, decimals } = TOKENS_MAP[to.symbol]
              const amount = tokenBalances?.[symbol] || Zero
              return {
                name,
                icon,
                symbol,
                decimals: decimals[chainId || ChainId["FUJI"]],
                amount,
                valueUSD: calculatePrice(
                  amount,
                  tokenPricesUSD?.[symbol],
                  decimals[chainId || ChainId["FUJI"]],
                ),
                swapType,
                isAvailable: IS_VIRTUAL_SWAP_ACTIVE
                  ? ![SWAP_TYPES.INVALID, SWAP_TYPES.SYNTH_TO_SYNTH].includes(
                      swapType,
                    )
                  : swapType == SWAP_TYPES.DIRECT, // TODO replace once VSwaps are live
              }
            })
            .sort(sortTokenOptions)
        : allTokens
    // from: all tokens always available. to: limited by selected "from" token.
    return {
      from: allTokens,
      to: toTokens,
    }
  }, [formState.currentSwapPairs, tokenBalances, chainId, tokenPricesUSD])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calculateSwapAmount = useCallback(
    debounce(async (formStateArg: FormState) => {
      if (swapContract == null || tokenBalances === null || poolData == null)
        return
      const cleanedFormFromValue = formStateArg.from.value.replace(/[$,]/g, "") // remove common copy/pasted financial characters
      if (cleanedFormFromValue === "" || isNaN(+cleanedFormFromValue)) {
        setFormState((prevState) => ({
          ...prevState,
          to: {
            ...prevState.to,
            value: BigNumber.from("0"),
          },
          priceImpact: BigNumber.from("0"),
        }))
        return
      }
      // TODO: improve the relationship between token / index
      const tokenIndexFrom = POOL?.poolTokens.findIndex(
        ({ symbol }) => symbol === formStateArg.from.symbol,
      )
      const tokenIndexTo = POOL?.poolTokens.findIndex(
        ({ symbol }) => symbol === formStateArg.to.symbol,
      )
      const amountToGive = parseUnits(
        cleanedFormFromValue,
        TOKENS_MAP[formStateArg.from.symbol].decimals[
          chainId || ChainId["FUJI"]
        ],
      )
      let error: string | null = null
      let amountToReceive: BigNumber
      if (amountToGive.gt(tokenBalances[formStateArg.from.symbol])) {
        error = t("insufficientBalance")
      }
      if (tokenIndexFrom > -1 && tokenIndexTo > -1) {
        amountToReceive = await swapContract.calculateSwap(
          tokenIndexFrom,
          tokenIndexTo,
          amountToGive,
        )
        const tokenTo = TOKENS_MAP[formStateArg.to.symbol]
        const tokenFrom = TOKENS_MAP[formStateArg.from.symbol]
        setFormState((prevState) => {
          const next = {
            ...prevState,
            error,
            to: {
              ...prevState.to,
              value: amountToReceive,
            },
            priceImpact: calculatePriceImpact(
              amountToGive.mul(
                BigNumber.from(10)
                  .pow(18 - tokenFrom.decimals[chainId || ChainId["FUJI"]])
                  .div(tokenFrom.symbol == "mYAK" ? 1000000 : 1),
              ),
              amountToReceive.mul(
                BigNumber.from(10)
                  .pow(18 - tokenTo?.decimals[chainId || ChainId["FUJI"]])
                  .div(tokenTo.symbol == "mYAK" ? 1000000 : 1),
              ),

              poolData?.virtualPrice,
            ),
            exchangeRate: calculateExchangeRate(
              amountToGive,
              tokenFrom.decimals[chainId || ChainId["FUJI"]],
              amountToReceive,
              tokenTo.decimals[chainId || ChainId["FUJI"]],
            ),
          }
          setPrevFormState(next)
          return next
        })
      } else {
        amountToReceive = Zero
      }
    }, 250),
    [setFormState, swapContract, tokenBalances, poolData],
  )

  function calculateSwapPairs(symbol: string): SwapData[] {
    const swapPairsListV = Object.values(POOLS_MAP)
    const swapPairsListK = Object.keys(POOLS_MAP)
    const swapPairs = []
    for (let key = 0; key < swapPairsListV.length; key++) {
      const e = swapPairsListV[key]
      const poolName = swapPairsListK[key]
      const tokenIndex = 0
      if (e.poolTokens[0]?.symbol === symbol) {
        swapPairs.push({
          from: {
            symbol: e.poolTokens[0].symbol,
            poolName,
            tokenIndex,
            isAvailable: true,
          },
          to: {
            symbol: e.poolTokens[1].symbol,
            poolName,
            tokenIndex,
            isAvailable: true,
          },
          type: SWAP_TYPES["DIRECT"],
          route: [],
        })
        continue
      }
      if (e.poolTokens[1]?.symbol === symbol) {
        swapPairs.push({
          from: {
            symbol: e.poolTokens[1].symbol,
            isAvailable: true,
            poolName,
            tokenIndex,
          },
          to: {
            symbol: e.poolTokens[0].symbol,
            isAvailable: true,
            poolName,
            tokenIndex,
          },
          type: SWAP_TYPES["DIRECT"],
          route: [],
        })
        continue
      }
      if (
        e.poolTokens[0]?.symbol === symbol &&
        e.poolTokens[1]?.symbol !== symbol
      ) {
        swapPairs.push({
          from: {
            symbol: e.poolTokens[0].symbol,
            isAvailable: false,
            poolName,
            tokenIndex,
          },
          to: {
            symbol: e.poolTokens[1].symbol,
            isAvailable: false,
            poolName,
            tokenIndex,
          },
          type: SWAP_TYPES["DIRECT"],
          route: [],
        })
        continue
      }
    }
    return swapPairs
  }

  function handleUpdateTokenFrom(symbol: string): void {
    if (symbol === formState.to.symbol) return handleReverseExchangeDirection()
    setFormState((prevState) => {
      const swapPairs = calculateSwapPairs(symbol)
      const activeSwapPair = swapPairs.find(
        (pair) => pair.to.symbol === symbol || pair.from.symbol === symbol,
      )
      const nextState = {
        ...prevState,
        error: null,
        from: {
          ...prevState.from,
          symbol,
          valueUSD: calculatePrice(
            prevState.from.value,
            tokenPricesUSD?.[symbol],
          ),
          poolName: activeSwapPair?.from.poolName,
          tokenIndex: activeSwapPair?.from.tokenIndex,
        },
        to: {
          ...prevState.to,
          value: Zero,
          valueSynth: Zero,
          valueUSD: Zero,
          symbol: prevState.to.symbol,
          poolName: activeSwapPair?.to.poolName,
          tokenIndex: activeSwapPair?.to.tokenIndex,
        },
        priceImpact: Zero,
        exchangeRate: Zero,
        route: activeSwapPair?.route || [],
        currentSwapPairs: swapPairs,
        swapType: activeSwapPair?.type || SWAP_TYPES.INVALID,
      }
      void calculateSwapAmount(nextState)
      return nextState
    })
  }

  function handleUpdateTokenTo(symbol: string): void {
    if (symbol === formState.from.symbol)
      return handleReverseExchangeDirection()
    setFormState((prevState) => {
      const activeSwapPair = prevState.currentSwapPairs.find(
        (pair) => pair.to.symbol === symbol,
      ) as SwapData
      const nextState = {
        ...prevState,
        from: {
          ...prevState.from,
          ...activeSwapPair.from,
        },
        error: null,
        to: {
          ...prevState.to,
          value: Zero,
          valueSynth: Zero,
          symbol,
          valueUSD: Zero,
          poolName: activeSwapPair.to.poolName,
          tokenIndex: activeSwapPair.to.tokenIndex,
        },
        priceImpact: Zero,
        exchangeRate: Zero,
        route: activeSwapPair.route || [],
        swapType: activeSwapPair.type || SWAP_TYPES.INVALID,
      }
      void calculateSwapAmount(nextState)
      return nextState
    })
  }

  async function handleConfirmTransaction(): Promise<void> {
    const fromToken = TOKENS_MAP[formState.from.symbol]
    await approveAndSwap({
      fromAmount: parseUnits(
        formState.from.value,
        fromToken.decimals[chainId || ChainId["FUJI"]],
      ),
      fromTokenSymbol: formState.from.symbol,
      toAmount: formState.to.value,
      toTokenSymbol: formState.to.symbol,
    })
    // Clear input after deposit
    setFormState((prevState) => ({
      ...prevState,
      error: null,
      from: {
        ...prevState.from,
        value: "0.0",
      },
      to: {
        ...prevState.to,
        value: Zero,
      },
      priceImpact: Zero,
      exchangeRate: Zero,
    }))
  }

  function handleReverseExchangeDirection(): void {
    setFormState((prevState) => {
      const swapPairs = calculateSwapPairs(prevState.to.symbol)
      const activeSwapPair = swapPairs.find(
        (pair) => pair.to.symbol === prevState.from.symbol,
      )
      const nextState = {
        error: null,
        from: {
          symbol: prevState.to.symbol,
          value: prevState.from.value,
          valueUSD: calculatePrice(
            prevState.from.value,
            tokenPricesUSD?.[prevState.to.symbol],
          ),
          poolName: activeSwapPair?.from.poolName,
          tokenIndex: activeSwapPair?.from.tokenIndex,
        },
        to: {
          symbol: prevState.from.symbol,
          value: Zero,
          valueUSD: Zero,
          valueSynth: Zero,
          poolName: activeSwapPair?.to.poolName,
          tokenIndex: activeSwapPair?.to.tokenIndex,
        },
        priceImpact: Zero,
        exchangeRate: Zero,
        route: activeSwapPair?.route || [],
        currentSwapPairs: swapPairs,
        swapType: activeSwapPair?.type || SWAP_TYPES.INVALID,
      }
      void calculateSwapAmount(nextState)
      return nextState
    })
  }

  function handleUpdateAmountFrom(value: string): void {
    setFormState((prevState) => {
      const nextState = {
        ...prevState,
        to: {
          ...prevState.to,
          valueUSD: Zero,
          valueSynth: Zero,
        },
        from: {
          ...prevState.from,
          value,
          valueUSD: calculatePrice(
            value,
            tokenPricesUSD?.[prevState.from.symbol],
          ),
        },
        priceImpact: Zero,
        exchangeRate: Zero,
      }
      void calculateSwapAmount(nextState)
      return nextState
    })
  }

  useEffect(() => {
    // watch user input fields and calculate other fields if necessary
    if (
      prevFormState.from.symbol !== formState.from.symbol ||
      prevFormState.from.value !== formState.from.value ||
      prevFormState.to.symbol !== formState.to.symbol
    ) {
      void calculateSwapAmount(formState)
    }
  }, [prevFormState, formState, calculateSwapAmount])

  const gasPrice = BigNumber.from(
    formatGasToString(
      { gasStandard, gasFast, gasInstant },
      gasPriceSelected,
      gasCustom,
    ),
  )

  const gasAmount = calculateGasEstimate(formState.swapType).mul(gasPrice) // units of gas * GWEI/Unit of gas

  const txnGasCost = {
    amount: gasAmount,
    valueUSD: tokenPricesUSD?.ETH
      ? parseUnits(tokenPricesUSD.ETH.toFixed(2), 18) // USD / ETH  * 10^18
          .mul(gasAmount) // GWEI
          .div(BigNumber.from(10).pow(25)) // USD / ETH * GWEI * ETH / GWEI = USD
      : null,
  }

  return (
    <SwapPage
      tokenOptions={tokenOptions}
      exchangeRateInfo={{
        pair: `${formState.from.symbol}/${formState.to.symbol}`,
        exchangeRate: formState.exchangeRate,
        priceImpact: formState.priceImpact,
        route: formState.route,
      }}
      txnGasCost={txnGasCost}
      fromState={formState.from}
      toState={{
        ...formState.to,
        value:
          formState.to.symbol === ""
            ? "0"
            : formatUnits(
                formState.to.value,
                TOKENS_MAP[formState.to.symbol].decimals[
                  chainId || ChainId["FUJI"]
                ],
              ),
      }}
      swapType={formState.swapType}
      error={formState.error}
      onChangeFromAmount={handleUpdateAmountFrom}
      onChangeFromToken={handleUpdateTokenFrom}
      onChangeToToken={handleUpdateTokenTo}
      onConfirmTransaction={handleConfirmTransaction}
      onClickReverseExchangeDirection={handleReverseExchangeDirection}
    />
  )
}

export default Swaps

const sortTokenOptions = (a: TokenOption, b: TokenOption) => {
  if (a.isAvailable !== b.isAvailable) {
    return a.isAvailable ? -1 : 1
  }
  if (a.swapType === SWAP_TYPES.INVALID || b.swapType === SWAP_TYPES.INVALID) {
    return a.swapType === SWAP_TYPES.INVALID ? 1 : -1
  }
  if (a.valueUSD.eq(b.valueUSD)) {
    const amountA = shiftBNDecimals(a.amount, 18 - a.decimals)
    const amountB = shiftBNDecimals(b.amount, 18 - b.decimals)
    return amountA.gt(amountB) ? -1 : 1
  } else if (a.valueUSD.gt(b.valueUSD)) {
    return -1
  }
  return 1
}
