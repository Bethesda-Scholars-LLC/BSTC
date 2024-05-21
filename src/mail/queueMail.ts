import { Mutex } from "async-mutex";
import { Aggregate } from "mongoose";
import { Duration } from "ts-duration";
import { getContractorById } from "../integration/tc models/contractor/contractor";
import ScheduleMail, { IScheduledMail } from "../models/scheduledEmail";
import { Log, PROD, TEST } from "../util";
import { hasContractorCompletedProfile } from "./contractorIncomplete";
import { contractorProfileCompleteEmail } from "./contractorProfileCompleted";
import { EmailTypes, MailOpts, transporterManager, transporterPascal } from "./mail";

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

    if(Array.isArray(mailData.cc))
        mailData.cc = mailData.cc.join(",");
    if(Array.isArray(mailData.bcc))
        mailData.bcc = mailData.bcc.join(",");


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
                        if (v.email_type === EmailTypes.ContractorIncomplete && v.contractor_id){
                            // they completed their profile
                            const contractor = await getContractorById(v.contractor_id);
                            // if contractor doesn't exist or has approved/rejected, don't send any emails
                            // and delete current email from db
                            if(!contractor || contractor.status !== "pending") {
                                await ScheduleMail.findByIdAndDelete(v._id).exec();
                                continue;
                            }
                            // if contractor is pending, check if profile has been completed,
                            // if profile has indeed been completed, send email and delete from db
                            if(hasContractorCompletedProfile(contractor)) {
                                transporterPascal.sendMail(contractorProfileCompleteEmail(contractor), (err, _) => {
                                    if(err)
                                        Log.error(err);
                                });
                                await ScheduleMail.findByIdAndDelete(v._id).exec();
                                continue;
                            }
                            // if contractor is pending and profile has not been completed, send email
                            // as scheduled
                        }

                        // if email is of the types below, send from manager's transporter and not personal transporter
                        if (v.email_type === EmailTypes.AwaitingBooking ||
                            v.email_type === EmailTypes.FirstLesson) {
                            transporterManager.sendMail(v, (err, _) => {
                                if (err)
                                    Log.error(err);
                            });
                        } else {
                            transporterPascal.sendMail(v, (err, _) => {
                                if (err)
                                    Log.error(err);
                            });
                        }

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
