import axios from "axios";
import { TCEvent } from "../types";
import { apiHeaders, apiUrl } from "../util";
import { getClientById, getMinimumClientUpdate, updateClient } from "./client";
import { addTCListener } from "./hook";
import { JobObject, UpdateServicePayload } from "./serviceTypes";
import { queueFirstLessonComplete } from "../mail/firstLesson";

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

    updateServiceById(job.id, setDftLocation(job));
});

/**
 * @description update status to in progress when contract added
 */
addTCListener("ADDED_CONTRACTOR_TO_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const job = event.subject;
    if(job.rcrs.length > 0){
        getClientById(job.rcrs[0].paying_client).then(client => {
            if(!client)
                return;
            if(client.pipeline_stage.id !== 35326) {
                return;
            }
            updateClient({
                ...getMinimumClientUpdate(client),
                pipeline_stage: matchedNotBooked
            });
        });
    }

    updateServiceById(job.id, {
        ...getMinimumJobUpdate(job),
        status: "in-progress"
    });
});

addTCListener("ADDED_A_LABEL_TO_A_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const job = event.subject;
    let i: number;
    if(job.rcrs.length > 0){
        getClientById(job.rcrs[0].paying_client).then(client => {
            if(!client)
                return;
            
            // matched and booked stage
            if (client.pipeline_stage.id === 35328) {
                for (i = 0; i < job.labels.length; i++) {
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
