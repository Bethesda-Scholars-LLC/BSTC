
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { getUserFullName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM, PROD } from "../util";
import { EmailTypes, MailOpts } from "./mail";
import { Screener } from "../types";
import { screeners } from "../integration/tc models/contractor/contractor";

export const ContractorScreenedEmail = (contractor: ContractorObject, screener: Screener): MailOpts => {
    return {
        from: BUSINESS_EMAIL_FROM, // eslint-disable-line,
        to: PROD ? process.env.BUSINESS_EMAIL_ADDRESS : (process.env.TEST_EMAIL_ADDRESS),
        cc: [screener.email, "pascal@bethesdascholars.com"], // copy screeners and management
        email_type: EmailTypes.Screening,
        subject: `Screening Added by ${screener.name}`,
        html: ReactDOMServer.renderToString(<ContractorScreened contractor={contractor} screener={screener}/>)
    };
};

const ContractorScreened = (props: {contractor: ContractorObject, screener: Screener}) => {
    return <p style={{margin: 0}}>
        <a href={`https://secure.tutorcruncher.com/contractors/${props.contractor.id}/`}>{getUserFullName(props.contractor)}</a>
        &nbsp;has been screend by {props.screener.name}.
        <br/>
    </p>;
};
