import { Mutex } from "async-mutex";
import { Aggregate } from "mongoose";
import { Duration } from "ts-duration";
import ScheduleMail, { IScheduledMail } from "../models/scheduledEmail";
import { Log, PROD, TEST } from "../util";
import { contractorIncompleteVerify } from "./contractorIncomplete";
import { EmailTypes, MailOpts, transporter } from "./mail";

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
    } catch (e) {
        Log.error(e);
    }
    return null;
};


export const queueEmail = async (timestamp: Duration, mailData: MailOpts) => {
    Log.debug(`Sending in ${timestamp.seconds} seconds`);
    const release = await scheduledMailMutex.acquire();
    try {
        new ScheduleMail({
            ...mailData,
            send_at: Date.now() + timestamp.milliseconds,
        }).save();
        Log.debug("saving");
    } catch (e) {
        Log.error(e);
    } finally {
        release();
    }
};

if(!TEST){
    setInterval(async () => {
        await scheduledMailMutex.acquire();
        try {
            const expiredEmails = await getExpiredMail();
            if (expiredEmails) {
                for(let i = 0; i < expiredEmails.length; i++) {
                    const v = expiredEmails[i];
                    // check if email_type == contractor_incomplete, if not continue
                    // check if any field is empty
                    // if so, send email, otherwise return
                    try {
                        if (v.email_type === EmailTypes.ContractorIncomplete && !contractorIncompleteVerify(v.contractor_id)){
                            await ScheduleMail.findByIdAndDelete(v._id).exec();
                            continue;
                        }

                        transporter.sendMail(v, (err, _) => {
                            if (err)
                                Log.error(err);
                        });

                        await ScheduleMail.findByIdAndDelete(v._id).exec();
                    } catch (e) {
                        Log.error(e);
                    }
                }
            }
        } catch (e) {
            Log.error(e);
        } finally {
            scheduledMailMutex.release();
        }
    }, PROD ? 60000 : 1000);
}
