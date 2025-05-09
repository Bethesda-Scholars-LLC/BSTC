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
        to: PROD ? client.email : process.env.TEST_EMAIL_ADDRESS,
        cc: [process.env.MANAGER_EMAIL_ADDRESS!, process.env.BUSINESS_EMAIL_ADDRESS!],
        email_type: EmailTypes.AwaitingBooking,
        client_id: client.id,
        client_name: getUserFullName(client),
        contractor_id: contractor.id,
        contractor_name: getUserFirstName(contractor),
        job_id: job.id,
        subject: `Booking a Lesson for ${job.rcrs[0]?.recipient_name.split(" ")[0] ?? "Your Child"}`,
        html: ReactDOMServer.renderToString(<AwaitingBooking contractor={contractor} client={client} job={job}/>)
    };
};

const AwaitingBooking = (props: {contractor: ContractorObject, client: ClientObject, job: JobObject}) => {
    return <p style={{margin: 0}}>
        Hi {getUserFirstName(props.client)},
        <br/>
        <br/>
        Just checking in if you were able to book a lesson with {getUserFirstName(props.contractor)}. Let me know if there are any scheduling issues.
        <br/>
        <br/>
        Thanks,
        <br/>
        <ManagerSignature/>
    </p>;
};
