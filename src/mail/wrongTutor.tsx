import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM, PROD } from "../util";

export const wrongTutorMail = (job: JobObject, client: ClientObject | null, contractor: ContractorObject | null): MailOptions => {
    return {
        from: BUSINESS_EMAIL_FROM, // eslint-disable-line,
        to: contractor?.email ?? (process.env.TEST_EMAIL_ADDRESS ?? "services@bethesdascholars.com"),
        subject: `${client ? getUserFirstName(client) : "Unknown Client" } Booked Wrong Lesson`,
        html: ReactDOMServer.renderToString(<WrongTutor job={job} client={client} contractor={contractor}/>)
    };
};

const WrongTutor = (props: {job: JobObject, client: ClientObject | null, contractor: ContractorObject | null}) => {
    const clientFirstName = props.client ? getUserFirstName(props.client) : "Unknown Client";
    const tutorName = props.contractor ? getUserFirstName(props.contractor) : "";

    return <p style={{margin: 0}}>
        Hi {tutorName},
        <br />
        <br />
        You may have received an email that one of our clients, {clientFirstName}, booked a <a href={`https://secure.tutorcruncher.com/cal/service/${props.job.id}/`}>lesson</a> with you.
        You are not currently assigned to this client, but the client may need a cover tutor if their normal tutor was not available at that time.
        <br />
        <br />
        <b>Please hold off on confirming the lesson at this time. Reply to this email if you are available for the lesson.</b>
        <br />
        <br />
        Thanks,
        <br />
        {process.env.BUSINESS_EMAIL_FROM}
    </p>;
};
