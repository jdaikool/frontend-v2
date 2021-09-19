import "./NoShareContent.scss"

import React, { ReactElement } from "react"

import { Link } from "react-router-dom"
import depositGraph from "../assets/deposit_graph.svg"
import { useTranslation } from "react-i18next"

function NoShareContent(): ReactElement {
  const { t } = useTranslation()
  return (
    <div className="no-share">
      <img src={depositGraph} alt="put tokens in pool" />
      <h2>
        {t("noDepositTitle")}
        <br />
        {t("noDepositTitle2")}
      </h2>
      <p>{t("noDeposit2")}</p>
      <Link to={`pools`}>
        <button className="actionBtn">{t("deposit")}</button>
      </Link>
    </div>
  )
}

export default NoShareContent
