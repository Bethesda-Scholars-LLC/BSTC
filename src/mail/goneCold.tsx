import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName, getUserFullName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM } from "../util";

export const goneColdMail = (job: JobObject, client: ClientObject | null, contractor: ContractorObject | null): MailOptions => {
    return {
        from: BUSINESS_EMAIL_FROM,
        to: "services@bethesdascholars.com",
        subject: `${client ? getUserFirstName(client.user) : "Unknown Client" } Cold Job`,
        html: ReactDOMServer.renderToString(<GoneCold job={job} client={client} contractor={contractor}/>)
    };
};

const GoneCold = (props: {job: JobObject, client: ClientObject | null, contractor: ContractorObject | null}) => {

    return <p style={{margin: 0}}>
        Hi,
        <br/>
        <br/>
        I noticed you have not had a lesson with [tutor] in a while. Just wanted to check in whether you are still interested in lessons with them. 
        <br/>
        <br/>
        Please let me know.
        <br/>
        <br/>
        Thanks,
    </p>;
};
