import React from "react";
import ReactDOMServer from "react-dom/server";
import { MailOptions } from "nodemailer/lib/sendmail-transport";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { ClientObject } from "../integration/tc models/client/types";
import { JobObject } from "../integration/tc models/service/types";
import { getUserFirstName } from "../integration/tc models/user/user";

const tutorMatchedMail = (tutor: ContractorObject, client: ClientObject | null, job: JobObject): MailOptions => {
    return {
        from: `"Bethesda Scholars" <services@bethesdascholars.com>`, // eslint-disable-line
        to: `"${tutor.user.email}"`,
        cc: "services@bethesdascholars.com",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        bcc: process.env.EMAIL_ADDRESS!,
        subject: "You have been assigned to a client",
        html: ReactDOMServer.renderToString(<TutorMatched tutor={tutor} client={client} job={job}/>)
    };
};

const TutorMatched = (props: {tutor: ContractorObject, client: ClientObject | null, job: JobObject}) => {
    
    const tutorName = getUserFirstName(props.tutor.user);
    
    return <p>
        Hi {tutorName},
        <br/>
        <br/>
        You have been assigned to the Job: {props.job.name} Please read through the following instructions carefully.
        <br/>
        <br/>
        1. Please set your availability in the next 24 hours. 
         <b>You must do this for your client to be notified that they have been matched with a tutor.</b>
        If it is already set, reply to this email so we can notify your client.
        <br/>
            a. To set your availability, first log in <a href="secure.tutorcruncher.com/bethesda-scholars/login">here</a>
            <br/>
            b. Once logged in, click on the blue "Actions" button below your initials and select "Set availability"
        <br/>
        2. Carefully <b>review these <a href="https://drive.google.com/file/d/1DV2rxcVndEYT-mar4XbTuM-ROIiLux2L/view?usp=sharing">tutoring guidelines</a></b> before your first lesson.
        <br/>
        3. Once your client books a lesson, you will be sent an email asking you to confirm the lesson. <b>You must confirm the lesson for it to take place.</b>
        <br/>
        4. Once the lesson is confirmed, contact your client using the information below (text usually works best), and ask for any work to look over in advance if you would like.
        <br/>
            a. You may coordinate lessons through text with the client, just make sure that the coordinated time is booked on TutorCruncher, so we can pay you accordingly.
        <br/>
        <br/>
        <b>Client Information:</b>
        <br/>
        Parent Name: {getUserFirstName(props.client?.user)} {props.client?.user.last_name}
        <br/>
        Student Name: {props.job.rcrs[0].recipient_name}
        <br/>
        Parent Phone Number: {props.client?.user.phone}
        <br/>
        Parent Email: {props.client?.user.email}
        <br/>
        <br/>
        You can find more details about the location, frequency, and subject under the tab "My Jobs" on your account.
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
        Bethesda Scholars Management
    </p>;
};

export default tutorMatchedMail;