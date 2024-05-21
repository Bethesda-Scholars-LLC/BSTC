import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName, getUserFullName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM } from "../util";

export const dormantBookedMail = (job: JobObject, client: ClientObject | null): MailOptions => {
    return {
        from: BUSINESS_EMAIL_FROM,
        to: process.env.BUSINESS_EMAIL_ADDRESS,
        subject: "Dormant Client Booked a Lesson",
        html: ReactDOMServer.renderToString(<DormantBooked job={job} client={client} />)
    };
};

const DormantBooked = (props: {job: JobObject, client: ClientObject | null}) => {
    const clientFullName = props.client ? getUserFullName(props.client.user) : "Unknown Client";

    return <p style={{margin: 0}}>
        This is a notification that {clientFullName} has booked a lesson. The job's ID is <a href={`https://secure.tutorcruncher.com/cal/service/${props.job.id}/`}></a>{props.job.id}.
        <br/>
        <br/>
        Please look into what happened and either check in with the client or move the client to live/prospect.
    </p>;
};
