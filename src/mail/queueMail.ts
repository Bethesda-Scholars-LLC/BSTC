import { Mutex } from "async-mutex";
import { Aggregate } from "mongoose";
import ScheduleMail, { IScheduledMail } from "../models/scheduledEmail";
import { Log, PROD } from "../util";
import { EmailTypes, MailOpts, transporter } from "./mail";
import { contractorIncompleteVerify } from "./contractorIncomplete";

export const scheduledMailMutex = new Mutex();

const getExpiredMail = async (): Promise<Aggregate<IScheduledMail[]> | null> => {
    try {
        return ScheduleMail.aggregate([
            {
                $match: {
                    send_at: { $lte: new Date() }
                }
            }
        ]);
    } catch(e) {
        Log.error(e);
    }
    return null;
};


export const queueEmail = async (timestamp: number, mailData: MailOpts) => {
    Log.debug(`Sending in ${(timestamp-Date.now())/1000} seconds`);
    const release = await scheduledMailMutex.acquire();
    try {
        new ScheduleMail({
            ...mailData,
            send_at: timestamp,
        }).save();
        Log.debug("saving");
    } catch(e) {
        Log.error(e);
    } finally {
        release();
    }
};

setInterval(async () => {
    const release = await scheduledMailMutex.acquire();
    try{
        const expiredEmails = await getExpiredMail();
        if(expiredEmails) {
            expiredEmails.forEach(async v => {
                Log.debug(v);
                try {
                    if(v.email_type === EmailTypes.ContractorIncomplete && !contractorIncompleteVerify(v))
                        return await ScheduleMail.findByIdAndDelete(v._id);

                    await transporter.sendMail(v, (err, _) => {
                        if(err)
                            Log.error(err);
                    });

                    await ScheduleMail.findByIdAndDelete(v._id);
                } catch (e) {
                    Log.error(e);
                }
            });
        }
    } catch (e){
        Log.error(e);
    } finally {
        release();
    }
}, PROD ? 60000 : 1000);