
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { getUserFirstName, getUserFullName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM, Log, PROD } from "../util";
import { EmailTypes, MailOpts } from "./mail";
import { screeners } from "../integration/tc models/contractor/contractor";

let screenerIndex = 0;
let lastContractorId = 0;

export const contractorProfileCompleteEmail = (contractor: ContractorObject): MailOpts => {
    if (contractor.id !== lastContractorId) {
        screenerIndex = (screenerIndex >= screeners.length - 1) ? 0 : screenerIndex + 1;
        lastContractorId = contractor.id;
    }
    const screener = screeners[screenerIndex];
    Log.info(`Sending contractorProfileCompleteEmail to screener ${screener.name}`);

    return {
        from: BUSINESS_EMAIL_FROM, // eslint-disable-line,
        to: PROD ? process.env.BUSINESS_EMAIL_ADDRESS : (process.env.TEST_EMAIL_ADDRESS),
        cc: [screener.email, "pascal@bethesdascholars.com"], // copy who is responsible for screenings
        email_type: EmailTypes.ProfileComplete,
        contractor_id: contractor.id,
        contractor_name: getUserFirstName(contractor),
        subject: "Contractor Profile Has Been Completed",
        html: ReactDOMServer.renderToString(<ContractorProfileComplete contractor={contractor}/>)
    };
};

const ContractorProfileComplete = ({contractor}: {contractor: ContractorObject}) => {
    return <p style={{margin: 0}}>
        <a href={`https://secure.tutorcruncher.com/contractors/${contractor.id}/`}>{getUserFullName(contractor)}</a>
        &nbsp;has completed their profile on Tutor Cruncher.
        <br/>
        Please review their profile application.
    </p>;
};
