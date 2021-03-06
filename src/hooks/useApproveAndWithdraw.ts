import {
  GAS_PRICE_BIGNUMBER,
  GAS_PRICE_DEFAULT,
  POOLS_MAP,
  PoolName,
  TRANSACTION_TYPES,
} from "../constants"
import { addSlippage, subtractSlippage } from "../utils/slippage"
import { useLPTokenContract, useSwapContract } from "./useContract"
import { AppState } from "../state"

import { BigNumber } from "@ethersproject/bignumber"
import { NumberInputState } from "../utils/numberInputState"
import checkAndApproveTokenForTrade from "../utils/checkAndApproveTokenForTrade"
import { formatDeadlineToNumber } from "../utils"
import { formatUnits } from "@ethersproject/units"
import { getFormattedTimeString } from "../utils/dateTime"
import { updateLastTransactionTimes } from "../state/application"
import { useActiveWeb3React } from "."
import { useDispatch } from "react-redux"
import { useSelector } from "react-redux"
import { useToast } from "./useToast"

interface ApproveAndWithdrawStateArgument {
  tokenFormState: { [symbol: string]: NumberInputState }
  withdrawType: string
  lpTokenAmountToSpend: BigNumber
}

export function useApproveAndWithdraw(
  poolName: PoolName,
): (state: ApproveAndWithdrawStateArgument) => Promise<void> {
  const dispatch = useDispatch()
  const swapContract = useSwapContract(poolName)
  const { account } = useActiveWeb3React()
  const { addToast, clearToasts } = useToast()
  const {
    slippageCustom,
    slippageSelected,
    transactionDeadlineCustom,
    transactionDeadlineSelected,
    allowInfiniteApproval,
  } = useSelector((state: AppState) => state.user)
  const lpTokenContract = useLPTokenContract(poolName)
  const POOL = POOLS_MAP[poolName]

  return async function approveAndWithdraw(
    state: ApproveAndWithdrawStateArgument,
  ): Promise<void> {
    try {
      if (!account) throw new Error("Wallet must be connected")
      if (!swapContract) throw new Error("Swap contract is not loaded")
      if (state.lpTokenAmountToSpend.isZero()) return
      if (lpTokenContract == null) return
      const allowanceAmount =
        state.withdrawType === "IMBALANCE"
          ? addSlippage(
              state.lpTokenAmountToSpend,
              slippageSelected,
              slippageCustom,
            )
          : state.lpTokenAmountToSpend
      await checkAndApproveTokenForTrade(
        lpTokenContract,
        swapContract.address,
        account,
        allowanceAmount,
        allowInfiniteApproval,
        {
          onTransactionStart: () => {
            return addToast(
              {
                type: "pending",
                title: `${getFormattedTimeString()} Approving spend for lpToken`,
              },
              {
                autoDismiss: false, // TODO: be careful of orphan toasts on error
              },
            )
          },
          onTransactionSuccess: () => {
            return addToast({
              type: "success",
              title: `${getFormattedTimeString()} Successfully approved spend for lpToken`,
            })
          },
          onTransactionError: () => {
            throw new Error("Your transaction could not be completed")
          },
        },
      )

      const clearMessage = addToast({
        type: "pending",
        title: `${getFormattedTimeString()} Starting your withdraw...`,
      })
      console.debug(
        `lpTokenAmountToSpend: ${formatUnits(state.lpTokenAmountToSpend, 18)}`,
      )
      const deadline = Math.round(
        new Date().getTime() / 1000 +
          60 *
            formatDeadlineToNumber(
              transactionDeadlineSelected,
              transactionDeadlineCustom,
            ),
      )
      let spendTransaction
      if (state.withdrawType === "ALL") {
        spendTransaction = await swapContract.removeLiquidity(
          state.lpTokenAmountToSpend,
          POOL.poolTokens.map(({ symbol }) =>
            subtractSlippage(
              BigNumber.from(state.tokenFormState[symbol].valueSafe),
              slippageSelected,
              slippageCustom,
            ),
          ),
          deadline,
          GAS_PRICE_DEFAULT
            ? {}
            : {
                gasPrice: GAS_PRICE_BIGNUMBER,
              },
        )
      } else if (state.withdrawType === "IMBALANCE") {
        spendTransaction = await swapContract.removeLiquidityImbalance(
          POOL.poolTokens.map(
            ({ symbol }) => state.tokenFormState[symbol].valueSafe,
          ),
          addSlippage(
            state.lpTokenAmountToSpend,
            slippageSelected,
            slippageCustom,
          ),
          deadline,
          GAS_PRICE_DEFAULT
            ? {}
            : {
                gasPrice: GAS_PRICE_BIGNUMBER,
              },
        )
      } else {
        // state.withdrawType === [TokenSymbol]
        spendTransaction = await swapContract.removeLiquidityOneToken(
          state.lpTokenAmountToSpend,
          POOL.poolTokens.findIndex(
            ({ symbol }) => symbol === state.withdrawType,
          ),
          subtractSlippage(
            BigNumber.from(
              state.tokenFormState[state.withdrawType || ""].valueSafe,
            ),
            slippageSelected,
            slippageCustom,
          ),
          deadline,
          GAS_PRICE_DEFAULT
            ? {}
            : {
                gasPrice: GAS_PRICE_BIGNUMBER,
              },
        )
      }

      await spendTransaction.wait()
      dispatch(
        updateLastTransactionTimes({
          [TRANSACTION_TYPES.WITHDRAW]: Date.now(),
        }),
      )
      clearMessage()
      addToast({
        type: "success",
        title: `${getFormattedTimeString()} Liquidity withdrawn`,
      })
    } catch (e) {
      console.error(e)
      clearToasts()
      addToast({
        type: "error",
        title: `${getFormattedTimeString()} Unable to complete your transaction`,
      })
    }
  }
}
