import axios from "axios";
import { queueFirstLessonComplete } from "../mail/firstLesson";
import { TCEvent } from "../types";
import { apiHeaders, apiUrl, capitalize, getAttrByMachineName } from "../util";
import { getClientById, getMinimumClientUpdate, updateClient } from "./client";
import { getContractorById, setLookingForJob } from "./contractor";
import { addTCListener } from "./hook";
import { JobObject, UpdateServicePayload } from "./serviceTypes";

const matchedNotBooked = 37478;

const updateServiceById = async (id: number, data: UpdateServicePayload) => {
    try{
        await axios(apiUrl(`/services/${id}/`), {
            method: "PUT",
            headers: apiHeaders,
            data: data
        });
    } catch(e){
        console.log(e);
    }
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
    // in person job
    if(jobLocation.includes("in-person")){
        oldJob.dft_location = 107916;
    // if its not in person, its online
    } else {
        oldJob.dft_location = 106892;
    }
    return oldJob;
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

        const school = getAttrByMachineName("student_school", client.extra_attrs);
        if(school){
            const updatePayload = getMinimumClientUpdate(client);
            updatePayload.extra_attrs = { student_school: school.value.split(" ").map(capitalize).join(" ")};
            await updateClient(updatePayload);
        }
    }
    

});

/**
 * @description update status to in progress when contract added
 */
addTCListener("ADDED_CONTRACTOR_TO_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const job = event.subject;
    if(job.rcrs.length > 0){
        if (job.conjobs) {
            const contractor = await getContractorById(job.conjobs[0].contractor);

            if(!contractor)
                return console.log(`contractor is null \n ${job.conjobs[0]}`);

            await setLookingForJob(contractor, false);
        }

        const client = await getClientById(job.rcrs[0].paying_client);

        if(client && client.pipeline_stage.id === 35326){
            await updateClient({
                ...getMinimumClientUpdate(client),
                pipeline_stage: matchedNotBooked
            });
        }
    }

    updateServiceById(job.id, {
        ...getMinimumJobUpdate(job),
        status: "in-progress"
    });
});

addTCListener("ADDED_A_LABEL_TO_A_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const job = event.subject;
    if(job.rcrs.length > 0){
        getClientById(job.rcrs[0].paying_client).then(client => {
            if(!client)
                return;
            
            // matched and booked stage
            if (client.pipeline_stage.id === 35328) {
                for (let i = 0; i < job.labels.length; i++) {
                    // first lesson is complete
                    if (job.labels[i].id === 169932) {
                        queueFirstLessonComplete(job);
                        return;
                    }
                }
            }
        });
    }
});
