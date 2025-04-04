import { Duration } from "ts-duration";
import { getContractorById, getManyContractors } from "../integration/tc models/contractor/contractor";
import TutorModel from "../models/tutor";
import { Log, getAttrByMachineName } from "../util";
import { SyncContractor } from "./contractorSync";

const _syncAllDBContractors = async () => {
    for(let i = 1;; i++) {
        const contractors = await getManyContractors(i);
        if(!contractors) {
            Log.error("contractors returned null");
            break;
        }
        for(let j = 0; j < contractors.results.length; j++) {
            Log.error(`Syncing ${contractors.results[j].first_name} ${contractors.results[j].last_name}...`);
            const contractor = await getContractorById(contractors.results[j].id);
            if(!contractor){
                Log.error(`${contractors.results[j].first_name} ${contractors.results[j].last_name} failed to load`);
                continue;
            }
            const tutor = await TutorModel.findOne({cruncher_id: contractor.id}).exec();
            if(!tutor) {
                await SyncContractor(contractor);
                continue;
            }

            tutor.recent_notifications = 0;
            tutor.recent_notifications_valid_until = new Date(Date.now() + Duration.hour(24 * 14).milliseconds);

            tutor.applications_accepted = 0;
            tutor.applications_accepted_valid_until = new Date(Date.now() + Duration.hour(24 * 14).milliseconds);

            tutor.school_full_name = getAttrByMachineName("school_1", contractor.extra_attrs)?.value;
            tutor.date_created = new Date(contractor.date_created);

            await tutor.save();
        }

        if(!contractors.next)
            break;
    }
};

/**
 *
 *   applications_accepted: 0,
 *   applications_accepted_valid_until: new Date(Date.now() + Duration.hour(24 * 14).milliseconds),
 *
 *   school_full_name: getAttrByMachineName("school_1", con.extra_attrs)!.value,
 *   date_created: new Date(con.date_created),
**/

// uncomment to sync entire tutorCruncher db
// syncAllDBContractors();