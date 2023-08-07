import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { ClientObject } from "../integration/tc models/client/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { JobObject } from "../integration/tc models/service/types";
import { getTutorPronouns } from "./firstLesson";

const clientMatchedMail = (tutor: ContractorObject, client: ClientObject, job: JobObject): MailOptions => {
    return {
        from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_ADDRESS}>`, // eslint-disable-line
        to: "colinhoscheit@gmail.com",
        cc: "services@bethesdascholars.com",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        bcc: process.env.EMAIL_ADDRESS!,
        subject: `Lesson with ${getUserFirstName(tutor.user)}`,
        html: ReactDOMServer.renderToString(<ClientMatched tutor={tutor} client={client} job={job}/>)
    };
};

const ClientMatched = (props: {tutor: ContractorObject, client: ClientObject, job: JobObject}) => {
    const tutorPronouns = getTutorPronouns(props.tutor);
    const tutorName = getUserFirstName(props.tutor.user);
    return <p>
        Hello {getUserFirstName(props.client.user)}. You need to schedule your lesson now with {tutorName}!
        {props.tutor.user.email && <>
            <br/>
            If you would like to get into contact with {tutorPronouns.pronouns[1]}, {tutorPronouns.possesive} email is {props.tutor.user.email}.
        </>}
        <br/>
        <br/>
        You will be charged ${props.job.dft_charge_rate.toFixed(2)}/hr for this lesson.
        &nbsp;
        This lesson will take place {props.job.dft_location.name}.
        <br/>
        Thanks,
        {process.env.EMAIL_FROM}
    </p>;
};

export default clientMatchedMail;