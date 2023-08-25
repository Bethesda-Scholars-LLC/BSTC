import React from "react";
import ReactDOMServer from "react-dom/server";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { getUserFirstName, getUserFullName } from "../integration/tc models/user/user";
import { PROD } from "../util";
import { EmailTypes, MailOpts } from "./mail";
import { ClientObject } from "../integration/tc models/client/types";
import { JobObject } from "../integration/tc models/service/types";

export const awaitingBookingMail = (contractor: ContractorObject, client: ClientObject, job: JobObject): MailOpts => {
    return {
        from: `"${process.env.PERSONAL_EMAIL_FROM}" <${process.env.PERSONAL_EMAIL_ADDRESS}>`, // eslint-disable-line,
        to: PROD ? client.user.email : (process.env.TEST_EMAIL_ADDRESS ?? contractor.user.email),
        cc: process.env.BUSINESS_EMAIL_ADDRESS,
        email_type: EmailTypes.AwaitingBooking,
        client_id: client.id,
        client_name: getUserFullName(client.user),
        contractor_id: contractor.id,
        contractor_name: getUserFirstName(contractor.user),
        job_id: job.id,
        subject: "Booking a Lesson",
        html: ReactDOMServer.renderToString(<AwaitingBooking contractor={contractor} client={client} job={job}/>)
    };
};

const AwaitingBooking = (props: {contractor: ContractorObject, client: ClientObject, job: JobObject}) => {
    return <p style={{margin: 0}}>
        Hi {getUserFirstName(props.client.user)},
        <br/>
        <br/>
        Just checking in if you were able to book a lesson with {getUserFirstName(props.contractor.user)}. Let me know if there are any scheduling issues.
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
