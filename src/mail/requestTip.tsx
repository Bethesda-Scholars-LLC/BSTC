import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM, PROD } from "../util";

export const requestTipMail = (client: ClientObject, contractor: ContractorObject): MailOptions => {
    return {
        from: BUSINESS_EMAIL_FROM, // eslint-disable-line,
        to: client?.email ?? (process.env.TEST_EMAIL_ADDRESS ?? "services@bethesdascholars.com"),
        cc: process.env.BUSINESS_EMAIL_ADDRESS,
        subject: "Want to Tip Your Tutor? 100% Goes to Them!",
        html: ReactDOMServer.renderToString(<RequestTip client={client} contractor={contractor}/>)
    };
};

const RequestTip = (props: {client: ClientObject, contractor: ContractorObject}) => {
    const clientFirstName = props.client ? getUserFirstName(props.client) : "Unknown Client";
    const tutorName = props.contractor ? getUserFirstName(props.contractor) : "";

    return <p style={{margin: 0}}>
        Hi {clientFirstName},
        <br />
        <br />
        We hope your experience with {tutorName} has been exceptional.
        If you'd like to show your appreciation, we've made it easy. Click below to leave a tip—<b>100% of the amount goes directly to your tutor.</b>
        <br />
        <br />
        <a href="https://www.bethesdascholars.com/tutor-tips">Send a Tip</a>
        <br />
        <br />
        Thanks,
        <br />
        {process.env.BUSINESS_EMAIL_FROM}
    </p>;
};
