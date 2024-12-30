import { Log } from "../util";
import TutorModel from "../models/tutor";
import cron from 'node-cron';
import { getContractorLock, syncTutorHours } from "../algo/contractorSync";

const syncRecentHours = async () => {
    Log.info("syncing recent hours for tutors with expired hours_valid_until");
    const expiredTutors = await TutorModel.find({
        "hours_valid_until" : { $lte : new Date() },
        "status" : "approved"
    });

    for (const tutor of expiredTutors) {
        const lock = await getContractorLock(tutor.id);
        await lock.acquire();

        try {
            const [validUntil, hours] = await syncTutorHours(tutor);
            tutor.hours_valid_until = validUntil;
            tutor.recent_hours = hours;

            await tutor.save();
            Log.info(`sucessfully updated tutor ${tutor.cruncher_id} recent hours to database`);
        } catch (error) {
            Log.error(`Error syncing recent hours for tutor ${tutor.cruncher_id}`);
        } finally {
            lock.release();
        }
    }
};

// schedule cron job for every day at 10PM EST
cron.schedule("0 3 * * *", async () => {
    Log.info("running daily tasks cron job");

    try {
        await syncRecentHours();
    } catch (error) {
        Log.error("Error running cron job", error);
    }
});