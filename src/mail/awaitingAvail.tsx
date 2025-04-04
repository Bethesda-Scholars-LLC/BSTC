import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName, getUserFullName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM, PROD, capitalize } from "../util";
import { EmailTypes, MailOpts } from "./mail";

export const awaitingAvailMail = (contractor: ContractorObject, client: ClientObject, job: JobObject): MailOpts => {
    return {
        from: BUSINESS_EMAIL_FROM,
        to: PROD ? process.env.BUSINESS_EMAIL_ADDRESS : (process.env.TEST_EMAIL_ADDRESS),
        email_type: EmailTypes.AwaitingAvail,
        client_id: client.id,
        client_name: getUserFullName(client),
        contractor_id: contractor.id,
        contractor_name: getUserFirstName(contractor),
        job_id: job.id,
        subject: "TUTOR HAS NOT SET AVAILABILITY",
        html: ReactDOMServer.renderToString(<AwaitingAvail contractor={contractor} client={client} job={job}/>)
    };
};

const AwaitingAvail = (props: {contractor: ContractorObject, client: ClientObject, job: JobObject}) => {
    return <p style={{margin: 0}}>
        This is a notification that {getUserFullName(props.contractor)} not set their availability in 24 hours.&nbsp;
        {capitalize(getUserFullName(props.client))} is waiting on {getUserFirstName(props.contractor)} to update their availability.&nbsp;
        The job's ID is <a href={`https://secure.tutorcruncher.com/cal/service/${props.job.id}/`}>{props.job.id}</a>. Auto invoicing has not been set on this job's settings.
        <br/>
        <br/>
        Please contact the tutor and tell them to update their availability or use the link in their email to notify their client.
    </p>;
};
