import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ClientObject } from "../integration/tc models/client/types";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM, PROD } from "../util";
import { getTutorPronouns } from "./firstLesson";

export const wrongTutorToClientMail = (job: JobObject, client: ClientObject | null, contractor: ContractorObject | null): MailOptions => {
    return {
        from: BUSINESS_EMAIL_FROM, // eslint-disable-line,
        to: client?.email ?? (process.env.TEST_EMAIL_ADDRESS ?? "services@bethesdascholars.com"),
        subject: "Lesson Booked With Wrong Tutor",
        html: ReactDOMServer.renderToString(<WrongTutorToClient job={job} client={client} contractor={contractor}/>)
    };
};

const WrongTutorToClient = (props: {job: JobObject, client: ClientObject | null, contractor: ContractorObject | null}) => {
    const clientFirstName = props.client ? getUserFirstName(props.client) : "Unknown Client";
    const tutorName = props.contractor ? getUserFirstName(props.contractor) : "";

    return <p style={{margin: 0}}>
        Hi {clientFirstName},
        <br />
        <br />
        You recently booked a lesson with {tutorName}. TutorCruncher has indicated that {tutorName} is not your assigned tutor and is assigned to a different client.
         We are checking on {tutorName}'s availability and will confirm with you whether the lesson will take place.
        <br />
        <br />
        If you have not been matched with an assigned tutor, please note that it takes 1-3 days to for our team to identify the right tutor for your needs,
         and we ask that you do not book any lessons with other tutors during this time.
         If you have an assigned tutor, please only book lessons with this assigned tutor unless directed otherwise by Bethesda Scholars.
        <br />
        <br />
        If {tutorName} is your assigned tutor, there has been an error in our system and you can proceed as usual.
        <br />
        <br />
        To help speed up the process, please reply to this email with any context on why {tutorName} is requested.
        <br />
        <br />
        Thanks,
        <br />
        {process.env.BUSINESS_EMAIL_FROM}
    </p>;
};
