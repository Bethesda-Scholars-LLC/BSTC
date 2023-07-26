import { getClientById } from "../integration/client";
import { JobObject } from "../integration/serviceTypes";
import { queueEmail } from "./queueMail";

const day = 86400000;
export const queueFirstLessonComplete = async (job: JobObject) => {
    if (!job.conjobs)
        return;

    const client = await getClientById(job.rcrs[0].paying_client);
    if(!client)
        return;
    
    const tutorFirstName = job.conjobs[0].name.split(" ")[0];
    const userEmail = client.user.email;
    const userFirstName = client.user.first_name ?? client.user.last_name;

    queueEmail((Date.now() + day), {
        from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_ADDRESS}>`, // eslint-disable-line
        to: userEmail,
        cc: "services@bethesdascholars.com",
        subject: `Lesson with ${tutorFirstName}`,
        html: `<p1>Hi ${userFirstName},
                    <br>
                    <br>
                    Just wanted to check in on the lesson with ${tutorFirstName} - how did it go? Would you like to continue lessons with them? Any feedback would be appreciated.
                    <br>
                    <br>
                    Thanks,
                    <br>
                    ${process.env.EMAIL_FROM}
                </p1>`,
    });
};

