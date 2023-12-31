import { getContractorById, getManyContractors } from "../integration/tc models/contractor/contractor";
import { Log } from "../util";
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

            await SyncContractor(contractor);
        }

        if(!contractors.next)
            break;
    }
};

// uncomment to sync entire tutorCruncher db
// syncAllDBContractors();