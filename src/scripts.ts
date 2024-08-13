import { Duration } from "ts-duration";
import ApiFetcher from "./api/fetch";
import { getRandomClient } from "./integration/tc models/client/client";
import { getContractorById, getMinimumContractorUpdate, getRandomContractor, setContractFilledOut, setTutorBias, updateContractor } from "./integration/tc models/contractor/contractor";
import { ContractorObject } from "./integration/tc models/contractor/types";
import { getManyServices, getMinimumJobUpdate, getRandomService, getServiceById, updateServiceById, updateServiceStatus } from "./integration/tc models/service/service";
import { DumbJob, JobObject } from "./integration/tc models/service/types";
import { getUserFullName } from "./integration/tc models/user/user";
import clientMatchedMail from "./mail/clientMatched";
import { transporterPascal } from "./mail/mail";
import { tutorReferralMail } from "./mail/tutorReferral";
import TutorModel from "./models/tutor";
import { ManyResponse } from "./types";
import { Log, PROD, getAttrByMachineName, stallFor } from "./util";


const getContractors = async (page?: number): Promise<ManyResponse<ContractorObject> | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/contractors?page=${page ?? 1}`))?.data;
    } catch(e) {
        Log.error(e);
        return null;
    }
};

const _setContractFilledOutToFalse = async (contractor: ContractorObject) => {
    try {
        Log.debug(`checking ${contractor.user.first_name} ${contractor.user.last_name} contract filled out`);

        // this should be the function that each contractor
        if(contractor.status === "approved" && getAttrByMachineName("contract_filled_out", contractor.extra_attrs)?.value === "True") {
            await setContractFilledOut(contractor, false);
            Log.debug("updated " + contractor.user.first_name + " " + contractor.user.last_name);
        }
    } catch (error) {
        Log.error("Error: ", error);
    }
};

const _setContractorStatusToDormant = async (contractor: ContractorObject) => {
    try {
        Log.debug(`checking ${contractor.user.first_name} ${contractor.user.last_name} contract filled out`);

        // this should be the function that each contractor
        if(contractor.status === "approved" && getAttrByMachineName("contract_filled_out", contractor.extra_attrs)?.value === "False") {
            const defaultTutor = getMinimumContractorUpdate(contractor);
            defaultTutor.status = "dormant";
            await updateContractor(defaultTutor);
            Log.debug("updated " + contractor.user.first_name + " " + contractor.user.last_name + " status to dormant");
        }
    } catch (error) {
        Log.error("Error: ", error);
    }
};

const _sendReferrals = async (contractor: ContractorObject) => {
    try {
        Log.debug(`checking ${contractor.user.first_name} ${contractor.user.last_name} approved`);

        if(contractor.status === "approved") {
            transporterPascal.sendMail(tutorReferralMail(contractor), (err) => {
                if (err)
                    Log.error(err);
            });
            Log.debug("sent referral email to " + contractor.user.first_name + " " + contractor.user.last_name);
        }
    } catch (error) {
        Log.error("Error: ", error);
    }
};

const _updateAllJobsToFinished = async (job: DumbJob) => {
    try {
        Log.debug(`checking job ${job.id} status`);

        if(job.status === "gone-cold" || job.status === "in-progress" || job.status === "pending") {
            await updateServiceStatus(job, "finished");
            Log.debug("updated job " + job.id + " status to finished");
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

    transporterPascal.sendMail( clientMatchedMail(tutor, client, service), (err) => {
        if(err)
            Log.error(err);
    });
};

const _changeDefaultServiceRate = async () => {
    for(let i = 1; ; i++){
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

const _syncDB = async () => {
    const allTutors = await TutorModel.find({}).exec();
    for(let i = 0; i < allTutors.length; i++) {
        const tutor = allTutors[i];
        const contractor = await getContractorById(tutor.cruncher_id);
        if(!contractor){
            Log.debug(`invalid contractor id: ${tutor.cruncher_id}, name: ${tutor.first_name} ${tutor.last_name}`);
            continue;
        }
        Log.debug(`Syncing ${getUserFullName(contractor.user)}`);

        tutor.bias = parseFloat(getAttrByMachineName("bias", contractor.extra_attrs)?.value);
        tutor.status = contractor.status;
        tutor.stars = getAttrByMachineName("rating", contractor.extra_attrs)?.value.split("/")[0],
        await tutor.save();
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

const doSomethingAllContractors = async (action: (contractor: ContractorObject) => Promise<void>) => {
    for (let i = 1; ; i++) {
        const allContractors = await getContractors(i);
        if(!allContractors)
            return;
        Log.debug(`Page ${i}`);
        for(let j = 0; j < allContractors.results.length; j++) {
            await action(allContractors.results[j]);
        }
        if(!allContractors.next)
            break;
    }
  };

  const doSomethingAllServices = async (action: (service: DumbJob) => Promise<void>) => {

    for(let i = 1; ; i++){
        const services = (await getManyServices(i));
        if(!services)
            return;
        Log.debug(`Page ${i}`);
        for(let j = 0; j < services.results.length; j++) {
            await action(services.results[j]);
        }
        if(!services.next)
            break;
    }
  };

// Uncomment lines below to run the script
if (!PROD) {
    Log.debug("Running scripts.ts");
    doSomethingAllContractors(async (c: ContractorObject) => {
        // await _setContractFilledOutToFalse(c);
        // await _sendReferrals(c);
        // await _setContractorStatusToDormant(c);
    })
        .catch(Log.error)
        .finally(() => doSomethingAllServices(async (j: DumbJob) => {
            // await _updateAllJobsToFinished(j);
        }).catch(Log.error));
}
