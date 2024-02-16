import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName, getUserFullName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM } from "../util";

export const wrongTutorMail = (job: JobObject, client: ClientObject | null, contractor: ContractorObject | null): MailOptions => {
    return {
        from: BUSINESS_EMAIL_FROM,
        to: "services@bethesdascholars.com",
        cc: "pascal@bethesdascholars.com",
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
        This job was created while booking a lesson through TutorCruncher, often indicating that the client booked a lesson with the wrong tutor.&nbsp;
        The client's pipeline stage has not been changed.
        <br/>
        <br/>
        <b>MAKE SURE TO SET AUTO-INVOICING SETTING ON THE NEW JOB.</b>
    </p>;
};
