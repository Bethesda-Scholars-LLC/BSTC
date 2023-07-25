import { queueEmail } from "./queueMail";

const day = 86400000;
export const queueFirstLessonComplete = async (job: any) => {
    const tutorName = "t_name";
    const userEmail = "colinhoscheit@gmail.com";
    const userFirstName = "user_first";
    const tutorFirstName = "tutor_first";

    queueEmail((Date.now()+day), {
        from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_ADDRESS}>`, // eslint-disable-line
        to: userEmail,
        cc: "services@bethesdascholars.com",
        subject: `Lesson with ${tutorName}`,
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

