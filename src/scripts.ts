import axios from "axios";
import { getContractorById, setLookingForJob, getRandomContractor } from "./integration/tc models/contractor/contractor";
import { ContractorObject } from "./integration/tc models/contractor/types";
import { Log, apiHeaders, apiUrl, getAttrByMachineName, stallFor } from "./util";
import { getMinimumClientUpdate, getRandomClient } from "./integration/tc models/client/client";
import { getManyServices, getMinimumJobUpdate, getRandomService, getServiceById, updateServiceById } from "./integration/tc models/service/service";
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

const _changeDefaultServiceRate = async () => {
    const service = await getRandomService();
    if(!service)
        return;

    for(let i = 1; i < 100_000; i++){
        const services = (await getManyServices(i));
        if(!services)
            return;

        await stallFor(1000);
        for(let j = 0; j < services.results.length; j++){
            const service = await getServiceById(services.results[j].id);

            if(!service)
                return;

            await stallFor(1000);

            Log.debug(`Id: ${service.id}`);
            Log.debug(`Name: ${service.name}`);
            Log.debug("----------------------");

            await updateServiceById(service.id, {
                ...getMinimumJobUpdate(service),
                dft_charge_rate: service.description?.toLowerCase().match("1st-5th grade") ? 40 : 45.0,
                dft_contractor_rate: 25.0
            });
            await stallFor(1000);
        }

        if(!services.next)
            break;
    }
    
};
