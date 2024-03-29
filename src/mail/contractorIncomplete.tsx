import React from "react";
import ReactDOMServer from "react-dom/server";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { PROD, getAttrByMachineName } from "../util";
import { EmailTypes, MailOpts } from "./mail";

/**
 * @param incompleteEmail Contractor incomplete email scheduled to send
 * @returns {boolean} wether or not to actually send it
 */
export const hasContractorCompletedProfile = (contractor: ContractorObject): boolean => {
    const bio = getAttrByMachineName("contractor_bio", contractor.extra_attrs);
    // if bio doesn't have a value or contractor skills length is 0
    return !(!bio?.value || bio?.value === "" || contractor.skills.length === 0);
};

export const contractorIncompleteMail = (contractor: ContractorObject): MailOpts => {
    return {
        from: `"${process.env.BUSINESS_EMAIL_FROM}" <${process.env.BUSINESS_EMAIL_ADDRESS}>`, // eslint-disable-line,
        to: PROD ? contractor.user.email : (process.env.TEST_EMAIL_ADDRESS ?? "services@bethesdascholars.com"),
        cc: process.env.BUSINESS_EMAIL_ADDRESS,
        subject: "REQUIRED ACTION - Profile Completion",
        html: ReactDOMServer.renderToString(<ContractorIncomplete contractor={contractor} />),
        contractor_id: contractor.id,
        email_type: EmailTypes.ContractorIncomplete
    };
};

const ContractorIncomplete = ({contractor}: { contractor: ContractorObject }) => {
    const tutorName = getUserFirstName(contractor.user);

    return <p style={{ margin: 0 }}>
        Hi {tutorName},
        <br />
        <br />
        You have not completed your profile. Please fill in your bio and add your teaching skills by editing your profile and
        clicking the blue actions button below your initials on your dashboard.
        <br />
        <br />
        We will not be able to review your application until this is complete. <b>When this has been completed, please click&nbsp;
            <a href={`https://${process.env.ORIGIN_URL}/app/contractor-incomplete/${contractor.id}`}>here</a> to notify us so we can review your application.
        </b>
        <br />
        <br />
        Thanks,
        <br />
        {process.env.BUSINESS_EMAIL_FROM}
    </p>;
};
