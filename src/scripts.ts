import axios from "axios";
import { getContractorById, setLookingForJob, getRandomContractor } from "./integration/tc models/contractor/contractor";
import { ContractorObject } from "./integration/tc models/contractor/types";
import { Log, apiHeaders, apiUrl, getAttrByMachineName, stallFor } from "./util";
import { getRandomClient } from "./integration/tc models/client/client";
import { getRandomService } from "./integration/tc models/service/service";
import clientMatchedMail from "./mail/clientMatched";
import { transporter } from "./mail/mail";


const getContractors = async (page?: number): Promise<ContractorObject | null> => {
    try {
        return (await axios(apiUrl(`/contractors?page=${page ?? 1}`), {
            headers: apiHeaders
        })).data;
    } catch(e) {
        Log.error(e);
        return null;
    }
};

// function that edits all contractors
const _editAllContractors = async () => {
    try {
        const allContractors: any = await getContractors();
        
        // change the lenght of iteration so API limit doesnt get hit
        // also change page in get request after 100
        for (let i = 0; i < allContractors.results.length; i++) {
            const contractor = await getContractorById(allContractors.results[i].id);

            if(!contractor)
                return;

            Log.debug(`checking ${contractor.user.first_name} ${contractor.user.last_name}`);

            // this should be the function that each contractor
            if(contractor.labels.reduce((prev, v) => prev || v.machine_name === "looking-for-job", false) &&
                !getAttrByMachineName("looking_for_job", contractor.extra_attrs)){
                Log.debug(contractor.user.first_name+" "+contractor.user.last_name);
                await setLookingForJob(contractor, true);
            }
            await stallFor(1000);
        }
    } catch (error) {
        Log.error("Error: ", error);
    }
};

const _testClientMatchedMail = async () => {
    const tutor = await getRandomContractor();
    const client = await getRandomClient();
    const service = await getRandomService();

    if(!tutor || !client || !service)
        return Log.debug("One is null");

    transporter.sendMail( clientMatchedMail(tutor, client, service), (err) => {
        if(err)
            Log.error(err);
    });
};

