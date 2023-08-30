import React from "react";
import ReactDOMServer from "react-dom/server";
import { getContractorById } from "../integration/tc models/contractor/contractor";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { IScheduledMail } from "../models/scheduledEmail";
import { PROD, getAttrByMachineName } from "../util";
import { EmailTypes, MailOpts } from "./mail";

/**
 * @param incompleteEmail Contractor incomplete email scheduled to send
 * @returns {boolean} wether or not to actually send it
 */
export const contractorIncompleteVerify = async (incompleteEmail: IScheduledMail): Promise<boolean> => {
    if (!incompleteEmail?.contractor_id)
        return false;
    const contractor = await getContractorById(incompleteEmail.contractor_id);
    if (!contractor)
        return false;
    const bio = getAttrByMachineName("contractor_bio", contractor.extra_attrs);
    // if bio doesn't have a value or contractor skills length is 0
    if (!bio?.value || bio?.value === "" || (contractor.skills?.length ?? 0 === 0))
        return true;

    return false;
};

export const contractorIncompleteMail = (contractor: ContractorObject): MailOpts => {
    return {
        from: `"${process.env.BUSINESS_EMAIL_FROM}" <${process.env.BUSINESS_EMAIL_ADDRESS}>`, // eslint-disable-line,
        to: PROD ? contractor.user.email : (process.env.TEST_EMAIL_ADDRESS ?? "services@bethesdascholars.com"),
        cc: process.env.BUSINESS_EMAIL_ADDRESS,
        subject: `Lessons with ${getUserFirstName(contractor.user)}`,
        html: ReactDOMServer.renderToString(<ContractorIncomplete contractor={contractor} />),
        contractor_id: contractor.id,
        email_type: EmailTypes.ContractorIncomplete
    };
};

const ContractorIncomplete = (props: { contractor: ContractorObject }) => {
    const tutorName = getUserFirstName(props.contractor.user);

    return <p style={{ margin: 0 }}>
        Hi {tutorName},
        <br />
        <br />
        You have not completed your profile. Please fill in your bio and add your teaching skills.
        <br />
        <br />
        We will not be able to review your application until this is complete.
        <br />
        <br />
        Thanks,
        <br />
        {process.env.BUSINESS_EMAIL_FROM}
    </p>;
};
