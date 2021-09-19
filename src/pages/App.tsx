import "../styles/global.scss"

import { BLOCK_TIME, ChainId } from "../constants"
import React, { ReactElement, Suspense, useCallback } from "react"
import { Route, Switch } from "react-router-dom"

import AddAvaxBSCNetwork from "./AddAvaxBSCNetwork"
import Airdrop from "./Airdrop"
import { AppDispatch } from "../state"
import Deposit from "./Deposit"
import Pools from "./Pools"
import Risk from "./Risk"
import Stake from "./Stake"
import Swap from "./Swap"
import ToastsProvider from "../providers/ToastsProvider"
import Web3ReactManager from "../components/Web3ReactManager"
import Withdraw from "./Withdraw"
import fetchGasPrices from "../utils/updateGasPrices"
import fetchTokenPricesUSD from "../utils/updateTokenPrices"
import { useActiveWeb3React } from "../hooks"
import { useDispatch } from "react-redux"
import usePoller from "../hooks/usePoller"

export default function App(): ReactElement {
  const dispatch = useDispatch<AppDispatch>()
  const fetchAndUpdateTokensPrice = useCallback(() => {
    fetchTokenPricesUSD(dispatch)
  }, [dispatch])
  const fetchAndUpdateGasPrice = useCallback(() => {
    void fetchGasPrices(dispatch)
  }, [dispatch])
  usePoller(fetchAndUpdateGasPrice, BLOCK_TIME)
  usePoller(fetchAndUpdateTokensPrice, BLOCK_TIME * 3)
  const { chainId } = useActiveWeb3React()
  const ALLOW_TESTNET = false

  let page
  if (
    chainId &&
    chainId !== ChainId["AVALANCHE"] &&
    chainId !== ChainId["BSC"] &&
    !ALLOW_TESTNET
  ) {
    // wrong network
    page = <AddAvaxBSCNetwork />
  }

  return (
    <Suspense fallback={null}>
      <Web3ReactManager>
        <ToastsProvider>
          {page || (
            <Switch>
              <Route exact path="/" component={Swap} />
              <Route exact path="/pools" component={Pools} />
              <Route exact path="/airdrop" component={Airdrop} />
              <Route exact path="/risk" component={Risk} />
              <Route exact path="/stake" component={Stake} />
              <Route exact path="/deposit" component={Deposit} />
              <Route exact path="/withdraw" component={Withdraw} />
            </Switch>
          )}
        </ToastsProvider>
      </Web3ReactManager>
    </Suspense>
  )
}
