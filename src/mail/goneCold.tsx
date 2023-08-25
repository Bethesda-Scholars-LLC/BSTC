import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { PROD } from "../util";
import { getTutorPronouns } from "./firstLesson";

export const goneColdMail = (job: JobObject, client: ClientObject | null, contractor: ContractorObject | null): MailOptions => {
    return {
        from: `"${process.env.PERSONAL_EMAIL_FROM}" <${process.env.PERSONAL_EMAIL_ADDRESS}>`, // eslint-disable-line,
        to: PROD ? (client?.user.email ?? process.env.BUSINESS_EMAIL_ADDRESS) : (process.env.TEST_EMAIL_ADDRESS ?? "services@bethesdascholars.com"),
        cc: process.env.BUSINESS_EMAIL_ADDRESS,
        subject: `Lessons with ${contractor ? getUserFirstName(contractor.user) : ""}`,
        html: ReactDOMServer.renderToString(<GoneCold job={job} client={client} contractor={contractor}/>)
    };
};

const GoneCold = (props: {job: JobObject, client: ClientObject | null, contractor: ContractorObject | null}) => {
    const clientName = props.client ? getUserFirstName(props.client.user) : "";
    const tutorName = props.contractor ? getUserFirstName(props.contractor.user) : "";
    const allPronouns = props.contractor ? getTutorPronouns(props.contractor) : {pronouns: ""};

    return <p style={{margin: 0}}>
        Hi {clientName},
        <br/>
        <br/>
        I noticed you have not had a lesson with {tutorName} in a while. Just wanted to check in whether you are still interested in lessons with {allPronouns.pronouns[1]}.
        <br/>
        <br/>
        Please let me know.
        <br/>
        <br/>
        Thanks,
        <br/>
        <b>{process.env.PERSONAL_EMAIL_FROM}</b>
        <br/>
        {process.env.SIGNATURE_DESCRIPTION}
        <br/>
        _________________________________
        <br/>
        <b>Website</b>: https://www.bethesdascholars.com
        <br/>
        <b>Mobile</b>: 202-294-6538
    </p>;
};
