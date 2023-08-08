import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { ClientObject } from "../integration/tc models/client/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { JobObject } from "../integration/tc models/service/types";
import { getTutorPronouns } from "./firstLesson";
import { capitalize, getAttrByMachineName } from "../util";

const clientMatchedMail = (tutor: ContractorObject, client: ClientObject, job: JobObject): MailOptions => {
    return {
        from: `"Bethesda Scholars" <services@bethesdascholars.com>`, // eslint-disable-line
        to: `"${client.user.email}"`,
        cc: "services@bethesdascholars.com",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        bcc: process.env.EMAIL_ADDRESS!,
        subject: `Tutor Found for ${job.rcrs[0].recipient_name.split(" ")[0]}`,
        html: ReactDOMServer.renderToString(<ClientMatched tutor={tutor} client={client} job={job}/>)
    };
};

const ClientMatched = (props: {tutor: ContractorObject, client: ClientObject, job: JobObject}) => {
    const tutorPronouns = getTutorPronouns(props.tutor);
    const tutorName = getUserFirstName(props.tutor.user);
    const tutorGrade = getAttrByMachineName("grade_1", props.tutor.extra_attrs)?.value;
    const tutorSchool = getAttrByMachineName("school_1", props.tutor.extra_attrs)?.value;
    const stripeFee = ((props.job.dft_charge_rate) * 1.039 + 0.30).toFixed(2);          // edit this to the proper amount
    return <p>
        Hi {getUserFirstName(props.client.user)},
        <br/>
        <br/>
        We have found a tutor for your child! {capitalize(tutorPronouns.possesive)} name is {tutorName}.
        Here are some brief details about {tutorPronouns.pronouns[1]} - you can view {tutorPronouns.possesive} full bio when booking a lesson.
        <br/>
        <br/>
        {tutorGrade && <><b>Tutor Grade: </b>{tutorGrade}</>}
        <br/>
        {tutorSchool && <><b>Tutor School: </b>{tutorSchool}</>}
        <br/>
        {props.tutor.user.mobile && <><b>Phone Number: </b>{props.tutor.user.mobile}</>}
        <br/>
        {props.tutor.user.email && <><b>Email: </b>{props.tutor.user.email}</>}
        <br/>
        <br/>
        Lessons will be {props.job.dft_location}.
        <br/>
        <br/>
        Please <a href="https://secure.tutorcruncher.com/bethesda-scholars/login">sign in</a> to book a lesson.
        If you forget how to book a lesson, instructions can be found on our website <a href="https://www.bethesdascholars.com/lessonscheduling">here</a>.
        If {tutorName}'s availability doesn't match yours, don't hesitate to email or text {tutorPronouns.pronouns[1]} directly to find a suitable time together.
        <b>Make sure to book every coordinated lesson with {tutorName} so we can pay {tutorPronouns.pronouns[1]} accordingly.</b>
        <br/>
        <br/>
        After the lesson, you will recieve a payment link to enter your card details into our system, and then you will be charged automatically.
        You will be charged ${props.job.dft_charge_rate} per hour per lesson. Please note that there is a ${stripeFee} Stripe processing fee per hour.
        <br/>
        <br/>
        If you have any questions, you can reply directly to this email.
        <br/>
        <br/>
        Thanks,
        <br/>
        Bethesda Scholars Management
    </p>;
};

export default clientMatchedMail;