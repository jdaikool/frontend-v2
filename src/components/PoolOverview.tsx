import "./PoolOverview.scss"

import { Center, Spinner } from "@chakra-ui/react"
import { ChainId, PoolName, TOKENS_MAP } from "../constants"
import React, { ReactElement } from "react"

import Button from "./Button"
import { PoolDataType } from "../hooks/usePoolData"
import classNames from "classnames"
import { formatUSDNumber } from "../utils"
import { formatUnits } from "@ethersproject/units"
import { useActiveWeb3React } from "../hooks"
import { useHistory } from "react-router-dom"
import { useTranslation } from "react-i18next"

interface Props {
  poolName: PoolName
  isOnlyStake: boolean
  data: PoolDataType | null
}

function PoolOverview({
  isOnlyStake,
  data,
  poolName,
}: Props): ReactElement | null {
  const { chainId } = useActiveWeb3React()
  const { t } = useTranslation()
  const histroy = useHistory()
  if (data == null)
    return (
      <div className="spinner">
        <Center my={22}>
          <Spinner
            thickness="4px"
            speed="1s"
            emptyColor="gray.200"
            color="#41c7cc"
            size="xl"
          />
        </Center>
      </div>
    )
  console.log(data)
  const formattedData = {
    name: data.name,
    volume: data.volume,
    apy: data.apy,
    tvl: data.totalStakedLpAmountUSD,
    tokens: data.tokens.map((coin) => {
      const token = TOKENS_MAP[coin.symbol]
      return {
        symbol: token.symbol,
        name: token.name,
        icon: token.icon,
        value: parseFloat(
          formatUnits(coin.value, token.decimals[chainId || ChainId["FUJI"]]),
        ).toFixed(3),
      }
    }),
  }
  return (
    <div className="poolOverview">
      <div className="table">
        <div className="left">
          <h4 className="title">{formattedData.name}</h4>
          {formattedData.tokens.length ? (
            <div className="tokens">
              <span style={{ marginRight: "8px" }}>[</span>
              <div className="tokens">
                {formattedData.tokens.map((token) => (
                  <div className="token" key={token.symbol}>
                    <img alt="icon" src={token.icon} />
                    <span>{token.name}</span>
                  </div>
                ))}
              </div>
              <span style={{ marginLeft: "8px" }}>]</span>
            </div>
          ) : null}
        </div>

        <div className="right">
          <div className="poolInfo">
            <div className="margin Apy">
              <span className="label">{t("TVL")}</span>
              <span>
                {formatUSDNumber(
                  parseFloat(Number(formattedData.tvl || 0).toPrecision(6)),
                  true,
                )}
              </span>
            </div>
            <div className="margin Apy">
              <span className="label">{t("apy")}</span>
              <span
                className={
                  classNames({ plus: formattedData.apy }) +
                  classNames({ minus: !formattedData.apy })
                }
              >
                {formattedData.apy}
              </span>
            </div>
          </div>
          <div className="buttons">
            <Button
              kind="secondary"
              onClick={() => histroy.replace("stake", { poolName })}
            >
              {t("stake")}
            </Button>
            {!isOnlyStake && (
              <>
                <Button
                  kind="ternary"
                  onClick={() =>
                    histroy.push("withdraw", { poolName: poolName })
                  }
                >
                  {t("withdraw")}
                </Button>
                <Button
                  kind="primary"
                  onClick={() => histroy.push("deposit", { poolName })}
                >
                  {t("deposit")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PoolOverview
