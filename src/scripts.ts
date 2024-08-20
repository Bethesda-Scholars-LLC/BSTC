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
import { ManyResponse, TCEvent } from "./types";
import { Log, PROD, getAttrByMachineName, stallFor } from "./util";
import { SyncContractor, addTutorHours } from "./algo/contractorSync";
import { LessonObject } from "./integration/tc models/lesson/types";
import LessonModel from "./models/lesson";
import { getLesson } from "./algo/lessonSync";

const SKIP_SERVICES = [1017486, 1015613, 1012669, 1012879, 1013245, 1016810, 1018292, 1018293, 990253, 971344, 1016014, 980516, 997913, 1005419, 1007580, 1009557];
const SKIP_CONTRACTORS: number[] = [];
const RUN_SCRIPTS = false;

const getContractors = async (page?: number): Promise<ManyResponse<ContractorObject> | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/contractors?page=${page ?? 1}`))?.data;
    } catch(e) {
        Log.error(e);
        return null;
    }
};

const getManyLessons = async (page?: number): Promise<ManyResponse<LessonObject> | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/appointments?page=${Math.max(page ?? 1, 1)}`))?.data as ManyResponse<LessonObject>;
    } catch (e) {
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
        if(contractor.status === "approved" && getAttrByMachineName("contract_filled_out", contractor.extra_attrs)?.value === "False") {
            const defaultTutor = getMinimumContractorUpdate(contractor);
            defaultTutor.status = "dormant";
            await updateContractor(defaultTutor);
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

const _syncLesson = async (ev: TCEvent<LessonObject>) => {
    const lesson = ev.subject;
    const dbLessons = await LessonModel.find({cruncher_id: lesson.id}).exec();
    Log.info(`successfully retrieved lesson object from DB ${lesson.id}`);
    const localLessons = getLesson(lesson);
    if(dbLessons.length > 0) {
        Log.info("lesson already exists in db");
        return;
    }

    for(let i = 0; i < localLessons.length; i++) {
        await LessonModel.create(localLessons[i]);
        Log.info("sucessfully created local lesson");
        await addTutorHours(localLessons[i]);
        Log.info("sucessfully added to tutor hours");
    }
    Log.info("sucessfully executed all tasks for this callback function");
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


const doSomethingAllContractors = async (action: (contractor: ContractorObject) => Promise<void>) => {
    for (let i = 1; ; i++) {
        const allContractors = await getContractors(i);
        if(!allContractors)
            return;
        Log.debug(`Contractors Page ${i}`);
        for(let j = 0; j < allContractors.results.length; j++) {
            Log.debug(`Contractor ${100 * (i - 1) + j}`);
            if (SKIP_CONTRACTORS.includes(allContractors.results[j].id))
                continue;
            const contractor = await getContractorById(allContractors.results[j].id);
            if (contractor)
                await action(contractor);
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
        Log.debug(`Services Page ${i}`);
        for(let j = 0; j < services.results.length; j++) {
            Log.debug(`Service ${100 * (i - 1) + j}`);
            if (SKIP_SERVICES.includes(services.results[j].id))
                continue;
            await action(services.results[j]);
        }
        if(!services.next)
            break;
    }
  };

  const doSomethingAllLessons = async (action: (service: LessonObject) => Promise<void>) => {

    for(let i = 1; ; i++){
        const lessons = (await getManyLessons(i));
        if(!lessons)
            return;
        Log.debug(`Lessons Page ${i}`);
        for(let j = 0; j < lessons.results.length; j++) {
            Log.debug(`Service ${100 * (i - 1) + j}`);
            await action(lessons.results[j]);
        }
        if(!lessons.next)
            break;
    }
  };

// Uncomment lines below to run the script
if (!PROD) {
    if (RUN_SCRIPTS) {
        Log.debug("Running scripts.ts");
        doSomethingAllContractors(async (c: ContractorObject) => {
            // await _setContractFilledOutToFalse(c);
            // await _sendReferrals(c);
            // await _setContractorStatusToDormant(c);
            // await SyncContractor(c);
        }).catch(Log.error);
        
        // doSomethingAllServices(async (j: DumbJob) => {
        //     await _updateAllJobsToFinished(j);
        // }).catch(Log.error);

        // doSomethingAllLessons(async (l: LessonObject) => {
        //     await _syncLesson(l);
        // });
    }
}
