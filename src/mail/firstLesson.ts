import { getClientById } from "../integration/client";
import { getContractorById } from "../integration/contractor";
import { ContractorObject } from "../integration/contractorTypes";
import { JobObject } from "../integration/serviceTypes";
import { getAttrByMachineName } from "../util";
import { queueEmail } from "./queueMail";

const getTutorPronouns = (tutor: ContractorObject): string => {
    const tutorGender = getAttrByMachineName("contractor_gender", tutor.extra_attrs).value.toLowerCase();
    if(tutorGender === "male")
        return "him";
    if(tutorGender === "female")
        return "her";
    return "them";
};

const day = 86400000;
export const queueFirstLessonComplete = async (job: JobObject) => {
    if (!job.conjobs || job.conjobs.length === 0){
        console.error("No tutor on job");
        return;
    }

    const client = await getClientById(job.rcrs[0].paying_client);
    if(!client)
        return;

    const tutor = await getContractorById(job.conjobs[0].contractor);
    if (!tutor || !tutor.extra_attrs)
        return;
    
    const tutorFirstName = job.conjobs[0].name.split(" ")[0];
    const tutorEmail = tutor.user.email;
    const userEmail = client.user.email;
    const userFirstName = client.user.first_name ?? client.user.last_name;

    queueEmail((Date.now() + day), {
        from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_ADDRESS}>`, // eslint-disable-line
        to: userEmail,
        cc: "services@bethesdascholars.com",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        bcc: process.env.EMAIL_ADDRESS!,
        subject: `Lesson with ${tutorFirstName}`,
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
                    <b>${process.env.EMAIL_FROM}</b> 
                    <br> 
                    ${process.env.SIGNATURE_DESCRIPTION} 
                    <br>
                    _________________________________ 
                    <br> 
                    <b>Website</b>: https://www.bethesdascholars.com 
                    <br> 
                    <b>Mobile</b>: 202-294-6538 
                </p1>`,
    });
};

