import React, { CSSProperties } from "react";
import ReactDOMServer from "react-dom/server";
import { MailOptions } from "nodemailer/lib/sendmail-transport";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { ClientObject } from "../integration/tc models/client/types";
import { JobObject } from "../integration/tc models/service/types";
import { cleanPhoneNumber, getUserFirstName, getUserFullName } from "../integration/tc models/user/user";

const tutorMatchedMail = (tutor: ContractorObject, client: ClientObject | null, job: JobObject): MailOptions => {
    return {
        from: `"Bethesda Scholars" <${process.env.BUSINESS_EMAIL_ADDRESS}>`, // eslint-disable-line
        to: tutor.user.email,
        cc: process.env.BUSINESS_EMAIL_ADDRESS,
        subject: "You have been assigned to a client",
        html: ReactDOMServer.renderToString(<TutorMatched tutor={tutor} client={client} job={job}/>)
    };
};

const TutorMatched = (props: {tutor: ContractorObject, client: ClientObject | null, job: JobObject}) => {
    const tutorName = getUserFirstName(props.tutor.user);
    const smallIndent: CSSProperties = {
        paddingLeft: "10px"
    };
    
    return <p style={{margin: 0}}>
        Hi {tutorName},
        <br/>
        <br/>
        You have been assigned to the Job: {props.job.name.trim()}{props.job.name.charAt(props.job.name.length-1) === "." ? "" : "."} Please read through the following instructions carefully.
        <ol style={smallIndent}>
            <li>
                Please set your availability in the next 24 hours.&nbsp;
                <b style={{backgroundColor: "yellow"}}>You must do this for your client to be notified that they have been matched with a tutor.</b>&nbsp;
                If it is already set, reply to this email so we can notify your client.
                <ol style={smallIndent} type="a">
                    <li>To set your availability, first log in <a href="secure.tutorcruncher.com/bethesda-scholars/login">here</a>.</li>
                    <li>Once logged in, click on the blue "Actions" button below your initials and select "Set availability."</li>
                </ol>
            </li>
            <li>Carefully <b>review these <a href="https://drive.google.com/file/d/1DV2rxcVndEYT-mar4XbTuM-ROIiLux2L/view?usp=sharing">tutoring guidelines</a></b> before your first lesson.</li>
            <li>
                When your client books a lesson with you, you will be notified and must confirm the lesson.
                Once the lesson is confirmed, <b>contact your client using the information below</b> (text usually works best), and ask for any work to look over in advance if you would like.
                <ol style={smallIndent} type="a">
                    <li style={{fontStyle: "italic"}}>You may coordinate lessons through text with the client, just make sure that the coordinated time is booked on TutorCruncher, so we can pay you accordingly.</li>
                </ol>
            </li>
        </ol>
        <b>Client Information:</b>
        <div style={{marginLeft: "20px"}}>
            Parent Name: {getUserFullName(props.client?.user)}
            <br/>
            Student Name: {props.job.rcrs[0].recipient_name}
            {props.client?.user.phone &&
                <>
                    <br/>
                    Parent Phone Number: {cleanPhoneNumber(props.client?.user.phone)}
                </>
            }
            <br/>
            Parent Email: {props.client?.user.email}
        </div>
        <br/>
        <b style={{backgroundColor: "yellow"}}>
            You can find more details about the location, frequency, and subject under the tab "My Jobs" on your account.
        </b>
        <br/>
        <br/>
        If a lesson lasts longer or shorter than one hour, before marking the lesson as complete, click on the blue "Actions" button, then select edit to change the length of the session.
        <br/>
        <br/>
        If you have any questions, you can reply directly to this email.
        <br/>
        <br/>
        Thanks,
        <br/>
        {process.env.BUSINESS_EMAIL_FROM}
    </p>;
};

export default tutorMatchedMail;