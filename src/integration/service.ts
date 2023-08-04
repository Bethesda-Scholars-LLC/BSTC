import axios from "axios";
import { queueFirstLessonComplete } from "../mail/firstLesson";
import { ManyResponse, TCEvent } from "../types";
import { Log, apiHeaders, apiUrl, capitalize, getAttrByMachineName, randomChoice, stallFor } from "../util";
import { getClientById, getMinimumClientUpdate, updateClient } from "./client";
import { ClientManager, ClientObject } from "./clientTypes";
import { getContractorById, setLookingForJob } from "./contractor";
import { addTCListener } from "./hook";
import { DumbJob, JobObject, PipelineStage, SessionLocation, UpdateServicePayload } from "./serviceTypes";
import AwaitingClient from "../models/clientAwaiting";
import { ContractorObject } from "./contractorTypes";

const blairSchools = ["argyle", "eastern", "loiederman", "newport mill", "odessa shannon", "parkland", "silver spring international", "takoma park", "blair"];
const churchillSchools = ["churchill", "cabin john", "hoover", "bells mill", "seven locks", "stone mill", "cold spring", "potomac", "beverly farms", "wayside"];
const _specialContractors = [1733309, 1644291]; // add the rest

const updateServiceById = async (id: number, data: UpdateServicePayload) => {
    try{
        await axios(apiUrl(`/services/${id}/`), {
            method: "PUT",
            headers: apiHeaders,
            data: data
        });
    } catch(e){
        Log.error(e);
    }
};

export const getServiceById = async (id: number): Promise<JobObject | null> => {
    try {
        return (await axios(apiUrl(`/services/${id}/`), {headers: apiHeaders})).data as JobObject;
    } catch (e) {
        Log.error(e);
    }
    return null;
};

export const getRandomService = async (): Promise<JobObject | null> => {
    try{
        const services = (await axios(apiUrl("/services"), { headers: apiHeaders })).data as ManyResponse<DumbJob>;
        
        if(services.count === 0)
            return null;

        return await getServiceById(randomChoice(services.results).id);
    } catch (e) {
        Log.debug(e);
    }
    return null;
};

const getMinimumJobUpdate = (job: JobObject): UpdateServicePayload => {
    return {
        name: job.name,
        dft_charge_rate: job.dft_charge_rate,
        dft_contractor_rate: job.dft_contractor_rate,
    };
};

const fixJobName = (job: JobObject): JobObject | null => {
    // if name has only one word in it, return and exit
    if(job.name.split("from")[1].trim().split(" ").length === 1)
        return null;

    const name = job.name.split("from")[1]
        .trim()
        .split(" ")
        .filter((_v: string, i: number, arr: string[]) => {
            return i === 0 || i === arr.length-1;
        }).map((v: string, i: number) => {
            if(i === 0)
                return v;
            // last initial
            return v.charAt(0).toUpperCase()+".";
        }).join(" ");

    job.name = job.name.split("from")[0]+"from "+name;
    return job;
};

const setDftLocation = (job: JobObject): UpdateServicePayload => {
    const jobLocation = job.description.toLowerCase()
        .split("lesson location:**\n")[1]
        .split("\n**")[0]
        .trim();

    const oldJob = getMinimumJobUpdate(job);

    // if it's set to in person, default location is in person, otherwise it's online
    oldJob.dft_location = jobLocation.includes("in-person") ? SessionLocation.InPerson : SessionLocation.Online;

    return oldJob;
};

const setJobRate = async (client: ClientObject, job: JobObject) => {
    const studentGrade = getAttrByMachineName("student_grade", client.extra_attrs);
    if (studentGrade?.value !== "1st-5th grade")
        return;

    const jobUpdate = getMinimumJobUpdate(job);
    jobUpdate.dft_charge_rate = 40.0;
    await updateServiceById(job.id, jobUpdate);
};

/**
 * @description update job name to only include first name and last initial
 */
addTCListener("REQUESTED_A_SERVICE", async (event: TCEvent<any, JobObject>) => {
    let job = event.subject;
    //    keep current job object unless fixJobName returns a new one
    job = fixJobName(job) ?? job;
    await updateServiceById(job.id, setDftLocation(job));
    
    if(job.rcrs.length > 0){
        const client = await getClientById(job.rcrs[0].paying_client);
        if(!client)
            return;

        await setJobRate(client, job);

        const school = getAttrByMachineName("student_school", client.extra_attrs);
        if(!school)
            return;

        // set school
        const updatePayload = getMinimumClientUpdate(client);
        updatePayload.status = "prospect";
        updatePayload.pipeline_stage = PipelineStage.NewClient;
        updatePayload.extra_attrs = { student_school: school.value.split(" ").map(capitalize).join(" ")};
        
        const schoolName = updatePayload.extra_attrs.student_school.toLowerCase();

        // set sophie hansen (blair), pavani (churchill), or mike (other) as client manager
        if (blairSchools.some(school => schoolName.includes(school))) {
            updatePayload.associated_admin = ClientManager.Sophie;
        } else if (churchillSchools.some(school => schoolName.includes(school))) {
            updatePayload.associated_admin = ClientManager.Pavani;
        } else {
            updatePayload.associated_admin = ClientManager.Mike;
        }

        await updateClient(updatePayload);
    }
});

addTCListener("REMOVED_CONTRACTOR_FROM_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const TCJob = event.subject;
    const realContractors = TCJob.conjobs.map(v => v.contractor);

    const DBJob = await AwaitingClient.findOne({job_id: TCJob.id});
    if(!DBJob)
        return;

    // keep only if tutor_id is in realContractors array
    DBJob.tutor_ids = DBJob.tutor_ids.filter(v => realContractors.includes(v));

    if(DBJob.tutor_ids.length === 0){
        await AwaitingClient.findByIdAndDelete(DBJob._id);
        return;
    }

    DBJob.save();


});

/**
 * @description update status to in progress when contract added
 */
addTCListener("ADDED_CONTRACTOR_TO_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const job = event.subject;

    // let tutorRate = null;
    if(job.rcrs.length > 0){
        const client = await getClientById(job.rcrs[0].paying_client);

        for(let i = 0; i < job.conjobs.length; i++) {
            const contractor = await getContractorById(job.conjobs[i].contractor);

            if(!contractor)
                return Log.debug(`contractor is null \n ${job.conjobs[i]}`);

            await setLookingForJob(contractor, false);

            try{
                if(client) {
                    const hasBeenAdded = (await AwaitingClient.findOne({
                        tutor_ids: contractor.id,
                        client_id: client.id,
                        job_id: job.id
                    }));
                    // if current tutor has not been added
                    if(hasBeenAdded === null) {
                        const clientJobRelation = (await AwaitingClient.findOne({
                            client_id: client.id,
                            job_id: job.id
                        }));
                        // if a client job relation has not already been made, create it
                        if(clientJobRelation === null) {
                            await new AwaitingClient({
                                client_id: client.id,
                                job_id: job.id,
                                tutor_ids: [contractor.id]
                            }).save();
                            // otherwise update current one
                        } else {
                            clientJobRelation.tutor_ids.push(contractor.id);
                            await clientJobRelation.save();
                        }
                    }
                }
            } catch (e) {
                Log.error(e);
            }
        }

        if(client && client.status === "prospect" && client.pipeline_stage.id === PipelineStage.NewClient){
            await updateClient({
                ...getMinimumClientUpdate(client),
                pipeline_stage: PipelineStage.MatchedNotBooked
            });
        }
    }
    updateServiceById(job.id, {
        ...getMinimumJobUpdate(job),
        status: "in-progress",
        /*
            conjobs: [{                         // CHECK THAT THIS GETS POSTED
                contractor: job.conjobs[0].contractor,
                pay_rate: tutorRate
            }]
        */
    });
});

addTCListener("ADDED_A_LABEL_TO_A_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const job = event.subject;
    if(job.rcrs.length > 0){
        getClientById(job.rcrs[0].paying_client).then(async client => {
            if(!client)
                return;
            
            // matched and booked stage
            if (client.status === "prospect" && client.pipeline_stage.id === PipelineStage.MatchedAndBooked) {
                for (let i = 0; i < job.labels.length; i++) {
                    // first lesson is complete
                    if (job.labels[i].id === 169932) {
                        await queueFirstLessonComplete(job);
                        const updatePayload = getMinimumClientUpdate(client);
                        updatePayload.pipeline_stage = PipelineStage.FeedbackRequested;
                        await updateClient(updatePayload);
                        return;
                    }
                }
            }
        });
    }
});
