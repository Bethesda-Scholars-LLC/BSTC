import { Duration } from "ts-duration";
import ApiFetcher from "./api/fetch";
import { getRandomClient } from "./integration/tc models/client/client";
import { getContractorById, getRandomContractor, setLookingForJob, setTutorBias } from "./integration/tc models/contractor/contractor";
import { ContractorObject } from "./integration/tc models/contractor/types";
import { getManyServices, getMinimumJobUpdate, getRandomService, getServiceById, updateServiceById } from "./integration/tc models/service/service";
import { getUserFullName } from "./integration/tc models/user/user";
import clientMatchedMail from "./mail/clientMatched";
import { transporter } from "./mail/mail";
import TutorModel from "./models/tutor";
import { Log, getAttrByMachineName, stallFor } from "./util";

const getContractors = async (page?: number): Promise<ContractorObject | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/contractors?page=${page ?? 1}`))?.data;
    } catch(e) {
        Log.error(e);
        return null;
    }
};

// function that edits all contractors
const _editAllContractors = async () => {
    try {
        const allContractors: any = await getContractors();
        
        // change the length of iteration so API limit doesn't get hit
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
            await stallFor(Duration.second(1));
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
    for(let i = 1; i < 100_000; i++){
        const services = (await getManyServices(i));
        if(!services)
            return;

        await stallFor(Duration.second(1));
        for(let j = 0; j < services.results.length; j++){
            const service = await getServiceById(services.results[j].id);

            if(!service)
                return;

            await stallFor(Duration.second(1));

            Log.debug(`Id: ${service.id}`);
            Log.debug(`Name: ${service.name}`);
            Log.debug("----------------------");

            await updateServiceById(service.id, {
                ...getMinimumJobUpdate(service),
                dft_charge_rate: service.description?.toLowerCase().match("1st-5th grade") ? 40 : 45.0,
                dft_contractor_rate: 25.0
            });
            await stallFor(Duration.second(1));
        }

        if(!services.next)
            break;
    }
    
};

const _syncBias = async () => {
    const allTutors = await TutorModel.find({}).exec();
    for(let i = 0; i < allTutors.length; i++) {
        const tutor = allTutors[i];
        const contractor = await getContractorById(tutor.cruncher_id);
        if(!contractor){
            Log.debug(`invalid contractor id: ${tutor.cruncher_id}, name: ${tutor.first_name} ${tutor.last_name}`);
            continue;
        }
        Log.debug(`Syncing ${getUserFullName(contractor.user)} bias`);

        await setTutorBias(contractor, tutor.bias as 0 | 1);

    }
};
