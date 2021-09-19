import "./Stake.scss"

import { ChainId, PoolName } from "../constants"

import React, { ReactElement } from "react"
import Footer from "../components/Footer"
import StakePool from "../components/StakePool"
import TopMenu from "../components/TopMenu"
import { useActiveWeb3React } from "../hooks"
import { useLocation } from "react-router-dom"

interface LocationState {
  state: { poolName: PoolName }
}
function Stake(): ReactElement {
  const {
    state: { poolName },
  }: LocationState = useLocation()
  const { chainId } = useActiveWeb3React()
  return (
    <div className="stake">
      <TopMenu activeTab={"stake"} />
      <div className="content">
        <div className="stakePoolList">
          {chainId && chainId === ChainId.AVALANCHE && (
            <StakePool poolName={poolName} />
          )}
          {chainId && chainId !== ChainId.AVALANCHE && (
            <>Staking coming soon!</>
          )}
        </div>
        <Footer />
      </div>
    </div>
  )
}

export default Stake
