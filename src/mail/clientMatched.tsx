import { MailOptions } from "nodemailer/lib/sendmail-transport";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { ClientObject } from "../integration/tc models/client/types";
import { cleanPhoneNumber, getUserFirstName, getUserFullName } from "../integration/tc models/user/user";
import { JobObject } from "../integration/tc models/service/types";
import { getTutorPronouns } from "./firstLesson";
import { capitalize, getAttrByMachineName, calcStripeFee, PROD } from "../util";

export const clientMatchedMail = (tutor: ContractorObject, client: ClientObject, job: JobObject): MailOptions => {
    return {
        from: `"Bethesda Scholars" <${process.env.BUSINESS_EMAIL_ADDRESS}>`, // eslint-disable-line
        bcc: "colinhoscheit@gmail.com",
        to: PROD ? client.user.email : (process.env.TEST_EMAIL_ADDRESS ?? client.user.email),
        cc: process.env.BUSINESS_EMAIL_ADDRESS,
        subject: `Tutor Found for ${job.rcrs[0].recipient_name.split(" ")[0]}`,
        html: ReactDOMServer.renderToString(<ClientMatched tutor={tutor} client={client} job={job}/>)
    };
};

const ClientMatched = (props: {tutor: ContractorObject, client: ClientObject, job: JobObject}) => {
    const tutorPronouns = getTutorPronouns(props.tutor);
    const tutorName = getUserFirstName(props.tutor.user);
    const studentName = props.job.rcrs[0].recipient_name.split(" ")[0];
    const tutorGrade = getAttrByMachineName("grade_1", props.tutor.extra_attrs)?.value;
    const tutorSchool = getAttrByMachineName("school_1", props.tutor.extra_attrs)?.value;
    const stripeFee = calcStripeFee(props.job.dft_charge_rate);
    return <p style={{margin: "0"}}>
        Hi {getUserFirstName(props.client.user)},
        <br/>
        <br/>
        We have found a tutor for {studentName}! {capitalize(tutorPronouns.possesive)} name is {getUserFullName(props.tutor.user)}.
         Here are some brief details about {tutorPronouns.pronouns[1]} - you can view {tutorPronouns.possesive} full bio when booking a lesson.
        <ul style={{listStyleType: "none", marginLeft: "15px", padding: "0"}}>
            {tutorGrade && <li><b>Tutor Grade: </b>{tutorGrade}</li>}
            {tutorSchool && <li><b>Tutor School: </b>{tutorSchool}</li>}
            {props.tutor.user.mobile && <li><b>Phone Number: </b>{cleanPhoneNumber(props.tutor.user.mobile)}</li>}
            {props.tutor.user.email && <li><b>Email: </b>{props.tutor.user.email}</li>}
        </ul>
        {props.job.dft_location && <>
            Lessons will be {props.job.dft_location?.name}.
            <br/>
            <br/>
        </>}
        Please <a href="https://secure.tutorcruncher.com/bethesda-scholars/login">sign in</a> to book a lesson.
         If you forget how to book a lesson, instructions can be found on our website <a href="https://www.bethesdascholars.com/lessonscheduling">here</a>.
         If {tutorName}'s availability doesn't match yours, don't hesitate to email or text {tutorPronouns.pronouns[1]} directly to find a suitable time together.
        <b> Make sure to book every coordinated lesson with {tutorName} so we can pay {tutorPronouns.pronouns[1]} accordingly.</b>
        <br/>
        <br/>
        After the lesson, you will receive a payment link to enter your card details into our system, and then you will be charged automatically.&nbsp;
        <b>You will be charged ${props.job.dft_charge_rate} per hour.</b> Please note that there is a ${stripeFee} Stripe processing fee per hour per lesson.
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