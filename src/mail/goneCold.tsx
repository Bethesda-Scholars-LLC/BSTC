import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { MANAGER_EMAIL_FROM, PROD } from "../util";
import { getTutorPronouns } from "./firstLesson";
import ManagerSignature from "./managerSignature";

export const goneColdMail = (job: JobObject, client: ClientObject | null, contractor: ContractorObject | null): MailOptions => {
    return {
        from: MANAGER_EMAIL_FROM, // eslint-disable-line,
        to: PROD ? (client?.email ?? process.env.BUSINESS_EMAIL_ADDRESS) : (process.env.TEST_EMAIL_ADDRESS ?? "services@bethesdascholars.com"),
        cc: [process.env.BUSINESS_EMAIL_ADDRESS!, process.env.MANAGER_EMAIL_ADDRESS!],
        subject: `Lessons with ${contractor ? getUserFirstName(contractor) : ""}`,
        html: ReactDOMServer.renderToString(<GoneCold job={job} client={client} contractor={contractor}/>)
    };
};

const GoneCold = (props: {job: JobObject, client: ClientObject | null, contractor: ContractorObject | null}) => {
    const clientName = props.client ? getUserFirstName(props.client) : "";
    const tutorName = props.contractor ? getUserFirstName(props.contractor) : "";
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
        <ManagerSignature/>
    </p>;
};
