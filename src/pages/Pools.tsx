import "./Pools.scss"

import {
  ChainId,
  DAIE_USDTE_POOL_NAME,
  DAI_DAIE_POOL_NAME,
  DUSDT_USDT_POOL_NAME,
  DWETH_ETH_POOL_NAME,
  ETH_WETHE_POOL_NAME,
  GDL_POOL_NAME,
  PANGOLIN_AVAX_GDL_POOL_NAME,
  PoolName,
  PoolTypes,
  RENBTC_WBTC_POOL_NAME,
  TSD_POOL_NAME,
  USDCE_POOL_NAME,
  USDT_DAI_POOL_NAME,
  USDT_USDTE_POOL_NAME,
  WBTC_WBTCE_POOL_NAME,
  YAK_POOL_NAME,
  ZBTC_WBTC_POOL_NAME,
  ZDAI_DAI_POOL_NAME,
  ZETH_ETH_POOL_NAME,
  ZUSDT_USDT_POOL_NAME,
} from "../constants"
import React, { ReactElement, useState } from "react"
import Footer from "../components/Footer"
import PoolOverview from "../components/PoolOverview"

import TopMenu from "../components/TopMenu"
import classNames from "classnames"
import { useActiveWeb3React } from "../hooks"
import usePoolData from "../hooks/usePoolData"

function Pools(): ReactElement {
  const { chainId } = useActiveWeb3React()
  const [gdlPoolData] = usePoolData(GDL_POOL_NAME)
  const [avaxgdlPoolData] = usePoolData(PANGOLIN_AVAX_GDL_POOL_NAME)
  const [renbtcPoolData] = usePoolData(RENBTC_WBTC_POOL_NAME)
  const [btcPoolData] = usePoolData(ZBTC_WBTC_POOL_NAME)
  const [daiPoolData] = usePoolData(ZDAI_DAI_POOL_NAME)
  const [ethPoolData] = usePoolData(ZETH_ETH_POOL_NAME)
  const [dwethPoolData] = usePoolData(DWETH_ETH_POOL_NAME)
  const [usdtPoolData] = usePoolData(ZUSDT_USDT_POOL_NAME)
  const [dusdtPoolData] = usePoolData(DUSDT_USDT_POOL_NAME)
  const [usdtDaiPoolData] = usePoolData(USDT_DAI_POOL_NAME)
  const [wbtcWbtcePoolData] = usePoolData(WBTC_WBTCE_POOL_NAME)
  const [ethWethePoolData] = usePoolData(ETH_WETHE_POOL_NAME)
  const [usdtUsdtePoolData] = usePoolData(USDT_USDTE_POOL_NAME)
  const [daiDaiePoolData] = usePoolData(DAI_DAIE_POOL_NAME)
  const [daieUsdtePoolData] = usePoolData(DAIE_USDTE_POOL_NAME)
  const [usdcePoolData] = usePoolData(USDCE_POOL_NAME)
  const [tsdPoolData] = usePoolData(TSD_POOL_NAME)
  const [yakPoolData] = usePoolData(YAK_POOL_NAME)

  const [filter, setFilter] = useState<
    PoolTypes | "all" | PoolTypes.LIVE | "outdated"
  >(PoolTypes.LIVE)

  const PoolDataList = [
    {
      poolData: gdlPoolData,
      poolName: GDL_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.LIVE,
      isOutdated: false,
      isOnlyStake: true,
    },
    {
      poolData: avaxgdlPoolData,
      poolName: PANGOLIN_AVAX_GDL_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.LIVE,
      isOutdated: false,
      isOnlyStake: true,
    },
    {
      poolData: wbtcWbtcePoolData,
      poolName: WBTC_WBTCE_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: ethWethePoolData,
      poolName: ETH_WETHE_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: usdtUsdtePoolData,
      poolName: USDT_USDTE_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: renbtcPoolData,
      poolName: RENBTC_WBTC_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: daiDaiePoolData,
      poolName: DAI_DAIE_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: daieUsdtePoolData,
      poolName: DAIE_USDTE_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.LIVE,
      isOutdated: false,
      isOnlyStake: false,
    },
    {
      poolData: daiPoolData,
      poolName: ZDAI_DAI_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: ethPoolData,
      poolName: ZETH_ETH_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: dwethPoolData,
      poolName: DWETH_ETH_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: usdtPoolData,
      poolName: ZUSDT_USDT_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: dusdtPoolData,
      poolName: DUSDT_USDT_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: false,
      isOnlyStake: false,
    },
    {
      poolData: btcPoolData,
      poolName: ZBTC_WBTC_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: usdtDaiPoolData,
      poolName: USDT_DAI_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.OTHER,
      isOutdated: true,
      isOnlyStake: false,
    },
    {
      poolData: yakPoolData,
      poolName: YAK_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.LIVE,
      isOutdated: false,
      isOnlyStake: false,
    },
    {
      poolData: usdcePoolData,
      poolName: USDCE_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.LIVE,
      isOutdated: false,
      isOnlyStake: false,
    },
    {
      poolData: tsdPoolData,
      poolName: TSD_POOL_NAME,
      ChainId: ChainId.AVALANCHE,
      type: PoolTypes.LIVE,
      isOutdated: false,
      isOnlyStake: false,
    },
  ]

  return (
    <div className="poolsPage">
      <TopMenu activeTab={"pools"} />
      <ul className="filters">
        {[
          ["all", "ALL"] as const,
          [PoolTypes.LIVE, "LIVE"] as const,
          ["outdated", "OUTDATED"] as const,
        ].map(([filterKey, text]) => (
          <li
            key={filterKey}
            className={classNames("filterTab", {
              selected: filter === filterKey,
              outdated: filterKey === "outdated",
            })}
            onClick={(): void => setFilter(filterKey)}
          >
            {text}
          </li>
        ))}
      </ul>
      <div className="content">
        {PoolDataList.filter(
          ({ type, isOutdated }) =>
            filter === "all" ||
            type === filter ||
            (filter === "outdated" && isOutdated),
        ).map((item, key) => {
          if (chainId && chainId === ChainId.AVALANCHE) {
            return (
              <PoolOverview
                key={key}
                data={item.poolData}
                isOnlyStake={item.isOnlyStake}
                poolName={item.poolName as PoolName}
              />
            )
          }
        })}
      </div>
      <div className="footerDiv">
        <Footer />
      </div>
    </div>
  )
}

export default Pools
