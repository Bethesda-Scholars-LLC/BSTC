import { MailOptions } from "nodemailer/lib/sendmail-transport";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { BUSINESS_EMAIL_FROM, PROD } from "../util";
import React from "react";
import { getUserFirstName, getUserFullName } from "../integration/tc models/user/user";
import ReactDOMServer from "react-dom/server";
import { JobObject } from "../integration/tc models/service/types";
import { ClientObject } from "../integration/tc models/client/types";

export const wrongTutorMail = (job: JobObject, client: ClientObject | null, contractor: ContractorObject | null): MailOptions => {
    return {
        from: BUSINESS_EMAIL_FROM,
        to: PROD ? "services@bethesdascholars.com" : (process.env.TEST_EMAIL_ADDRESS ?? "services@bethesdascholars.com"),
        subject: `${client ? getUserFirstName(client.user) : "Unknown Client" } Booked Wrong Lesson`,
        html: ReactDOMServer.renderToString(<WrongTutor job={job} client={client} contractor={contractor}/>)
    };
};

const WrongTutor = (props: {job: JobObject, client: ClientObject | null, contractor: ContractorObject | null}) => {
    const clientFullName = props.client ? getUserFullName(props.client.user) : "Unknown Client";
    const contractorFullName = props.contractor ? getUserFullName(props.contractor.user) : "Unknown Tutor";

    return <p style={{margin: 0}}>
        This is a notification that {clientFullName} has booked a lesson with {contractorFullName}. The job's ID is <b>{props.job.id}</b>.
        <br/>
        <br/>
        This job was created while booking a lesson through TutorCruncher, often indicating that the client book a lesson with the wrong tutor.&nbsp;
        The client's pipeline stage has not been changed.
    </p>;
};
