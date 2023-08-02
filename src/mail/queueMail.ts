import { Mutex } from "async-mutex";
import { MailOptions } from "nodemailer/lib/sendmail-transport";
import { Log, PROD, readFile, writeFile } from "../util";
import { transporter } from "./mail";


type ScheduledMailJSON = {
    [key: string]: MailOptions
};

export const scheduledMailMutex = new Mutex();

const getScheduledMail = async (): Promise<ScheduledMailJSON> => {
    try {
        return JSON.parse((await readFile("./scheduledMail.json")).toString("utf-8"));
    } catch(e) {
        return {};
    }
};

const writeScheduledMail = async (mail: ScheduledMailJSON): Promise<null> => {
    return writeFile("./scheduledMail.json", JSON.stringify(mail, undefined, 2));
};

export const queueEmail = async (timestamp: number, mailData: MailOptions) => {
    Log.debug(`Sending in ${(Date.now()-timestamp)/1000} seconds`);
    const release = await scheduledMailMutex.acquire();
    try {
        const scheduledMail = await getScheduledMail();
        scheduledMail[timestamp.toString()] = mailData;
        writeScheduledMail(scheduledMail);
    } catch(e) {
        Log.error(e);
    } finally {
        release();
    }
};

setInterval(async () => {
    const release = await scheduledMailMutex.acquire();
    try{
        const scheduledMail = await getScheduledMail();
        const scheduledMailArr = Object.entries(scheduledMail);
        for(let i = 0; i < scheduledMailArr.length; i++) {
            const entry = scheduledMailArr[i];
            const expiresOn = parseInt(entry[0]);
            // if invalid key, delete it
            if(isNaN(expiresOn)) {
                delete scheduledMail[entry[0]];
                continue;
            }
            // if expired
            if(Date.now() >= expiresOn){
                // send
                transporter.sendMail(entry[1], (error, _info) => {
                    if (error) return Log.error(error);
                    Log.debug("verification sent");
                });
                // delete it
                delete scheduledMail[entry[0]];
            }
        }
        writeScheduledMail(scheduledMail);
    } catch (e){
        Log.error(e);
    } finally {
        release();
    }
}, PROD ? 60000 : 1000);