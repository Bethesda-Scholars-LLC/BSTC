import React from "react";
import ReactDOMServer from "react-dom/server";
import { Duration } from "ts-duration";
import { getClientById } from "../integration/tc models/client/client";
import { ClientObject } from "../integration/tc models/client/types";
import { getContractorById } from "../integration/tc models/contractor/contractor";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { JobObject } from "../integration/tc models/service/types";
import { cleanPhoneNumber, getUserFirstName } from "../integration/tc models/user/user";
import { Log, MANAGER_EMAIL_FROM, PROD, getAttrByMachineName } from "../util";
import { EmailTypes } from "./mail";
import { queueEmail } from "./queueMail";
import ManagerSignature from "./managerSignature";

export const FirstLesson = (props: { job: JobObject, tutor: ContractorObject, client: ClientObject }) => {
    const tutorFirstName = props.job.conjobs[0].name.split(" ")[0];
    const tutorPhoneNumber = cleanPhoneNumber(props.tutor.user.mobile);
    const tutorEmailAddress = props.tutor.user.email;
    const userFirstName = getUserFirstName(props.client.user);
    const pronouns = getTutorPronouns(props.tutor);

    return <p style={{ margin: 0 }}>
        Hi {userFirstName},
        <br />
        <br />
        Just wanted to check in on the lesson with {tutorFirstName} - how did it go? Would you like to continue lessons with {pronouns.pronouns[1]}?
        {(tutorPhoneNumber || tutorEmailAddress) && <>
            <br />
            <br />
            If you have not gotten in contact with {tutorFirstName}, {pronouns.possesive} {tutorPhoneNumber ? ` phone number is ${tutorPhoneNumber}` : ` email address is ${tutorEmailAddress}`}.
            It might make scheduling easier, just remember to book the lesson after a time is coordinated.
        </>}
        <br />
        <br />
        Thanks,
        <br />
        <ManagerSignature/>
    </p>;
};

export const getTutorPronouns = (tutor: ContractorObject): {
    pronouns: [string, string],
    possesive: string
} => {
    const tutorGender = getAttrByMachineName("contractor_gender", tutor.extra_attrs)?.value.toLowerCase() ?? "";
    if (tutorGender === "male")
        return {
            pronouns: ["he", "him"],
            possesive: "his"
        };
    if (tutorGender === "female")
        return {
            pronouns: ["she", "her"],
            possesive: "her"
        };
    return {
        pronouns: ["they", "them"],
        possesive: "their"
    };
};

const day = Duration.hour(24);
export const queueFirstLessonComplete = async (job: JobObject) => {
    if (!job.conjobs || job.conjobs.length === 0)
        return;

    const client = await getClientById(job.rcrs[0].paying_client);
    if (!client)
        return;

    const tutor = await getContractorById(job.conjobs[0].contractor);
    if (!tutor || !tutor.extra_attrs)
        return;

    const tutorFirstName = job.conjobs[0].name.split(" ")[0];
    const userEmail = client.user.email;

    queueEmail(PROD ? day : Duration.second(10), {
        from: MANAGER_EMAIL_FROM, // eslint-disable-line
        to: PROD ? userEmail : (process.env.TEST_EMAIL_ADDRESS),
        cc: [process.env.BUSINESS_EMAIL_ADDRESS!, process.env.MANAGER_EMAIL_ADDRESS!],
        email_type: EmailTypes.FirstLesson,
        subject: `Lesson with ${tutorFirstName}`,
        html: ReactDOMServer.renderToString(<FirstLesson job={job} client={client} tutor={tutor} />)
        /*
        html: `<p1>Hi ${userFirstName},
                    <br>
                    <br>
                    Just wanted to check in on the lesson with ${tutorFirstName} - how did it go? Would you like to continue lessons with ${getTutorPronouns(tutor)}?
                    <br>
                    <br>
                    If you would like to schedule more lessons, ${tutorFirstName}'s email is ${tutorEmail}. It might make scheduling easier, just remember to book the lesson after a time is coordinated.
                    <br>
                    <br>
                    Thanks,
                    <br>
                    --
                    <br>
                    <b>${process.env.PERSONAL_EMAIL_FROM}</b>
                    <br>
                    ${process.env.SIGNATURE_DESCRIPTION}
                    <br>
                    _________________________________
                    <br>
                    <b>Website</b>: https://www.bethesdascholars.com
                    <br>
                    <b>Mobile</b>: 202-294-6538
                </p1>`,
        */
    });
    Log.info("sucessfully queued first lesson complete email");
};

