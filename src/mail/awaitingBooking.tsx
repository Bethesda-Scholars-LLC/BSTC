import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName, getUserFullName } from "../integration/tc models/user/user";
import { MANAGER_EMAIL_FROM, PROD } from "../util";
import { EmailTypes, MailOpts } from "./mail";
import ManagerSignature from "./managerSignature";

export const awaitingBookingMail = (contractor: ContractorObject, client: ClientObject, job: JobObject): MailOpts => {
    return {
        from: MANAGER_EMAIL_FROM, // eslint-disable-line,
        to: PROD ? client.user.email : process.env.TEST_EMAIL_ADDRESS,
        cc: [process.env.MANAGER_EMAIL_ADDRESS!, "services@bethesdascholars.com"],
        email_type: EmailTypes.AwaitingBooking,
        client_id: client.id,
        client_name: getUserFullName(client.user),
        contractor_id: contractor.id,
        contractor_name: getUserFirstName(contractor.user),
        job_id: job.id,
        subject: `Booking a Lesson with ${getUserFirstName(contractor.user)}`,
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
        <ManagerSignature/>
    </p>;
};
