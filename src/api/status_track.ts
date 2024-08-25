import { Duration } from "ts-duration";
import { extractFieldFromJob } from "../algo/algo";
import { addTCListener } from "../integration/hook";
import { SessionLocation, getServiceById } from "../integration/tc models/service/service";
import { DumbJob, JobObject } from "../integration/tc models/service/types";
import { ManyResponse, Req, Res, TCEvent } from "../types";
import ApiFetcher from "./fetch";

import { Log } from "../util";
import { errorMsg } from "./api";

// type JobStatus = "pending" | "in-progress" | "available" | "finished" | "gone-cold";

/**
 * @route /api/job/status
 */
export const GETJobsByStatus = async (req: Req, res: Res) => {
    const status = req.query.s?.toString();
    if(!status || !["pending", "in-progress", "available", "finished", "gone-cold"].includes(status))
       return res.status(400).json(errorMsg("query field \"s\" invalid"));
    const jobs = getJobsWithStatus(status);
    jobs.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
    res.json({
        count: jobs.length,
        jobs
    });
};


type MapJob = DumbJob | (JobObject & {
    details?: {
        student_name?: string,
        grade?: string,
        lesson_frequency?: string,
        needed_subjects?: string,
        location?: string,
    }
});

const statusMap: {
    [status: string]: {
        [job_id: string]: MapJob
    }
} = { };

const isFullJob = (x: DumbJob | JobObject): x is JobObject => {
    return "description" in x;
};

export const getJobsWithStatus = (status: string): MapJob[] => {
    return Object.values(statusMap[status]??{});
};

export const getJobStatus = (job_id: string): string | null => {
    const statusList = Object.keys(statusMap);

    for(let i = 0; i < statusList.length; i++) {
        const job = statusMap[statusList[i]][job_id];

        if(job)
            return statusList[i];
    }

    return null;
};

export const removeStatusJob = (job: MapJob) => {
    const statusList = Object.keys(statusMap);

    for(let i = 0; i < statusList.length; i++) {
        if(statusMap[statusList[i]][job.id]) {
            delete statusMap[statusList[i]][job.id];
            break;
        }
    }
};

export const updateStatusJob = async (job: MapJob) => {
    Log.info("updating status map");
    const statusList = Object.keys(statusMap);

    for(let i = 0; i < statusList.length; i++) {
        if(statusMap[statusList[i]][job.id]) {
            // if current job is a dumbjob but job stored in map is a JobObject
            // swap job and JobObject
            if(!isFullJob(job) && isFullJob(statusMap[statusList[i]][job.id]))
                job = statusMap[statusList[i]][job.id];

            delete statusMap[statusList[i]][job.id];
            break;
        }
    }

    if(!job.status || job.status === "gone-cold") {
        return;
    }

    if(!statusMap[job.status])
        statusMap[job.status] = {};

    // if job is available, make sure we have the complete struct info
    if(job.status === "available") {
        if(!isFullJob(job)){
            try {
                const newJob = await getServiceById(job.id);

                if(newJob)
                    job = newJob;
            } catch (e) {
                Log.error(e);
            }
        }

        if(isFullJob(job) && (!job.details || job.details.student_name === "No Students")) {
            const jobLocation = job.description.toLowerCase()
                .split("lesson location:**\n")[1]
                .split("\n**")[0]
                .trim();
            const inPerson = jobLocation.includes("in-person") ? SessionLocation.InPerson : SessionLocation.Online;
            job.details = {
                student_name: job.rcrs[0]?.recipient_name??"No Students",
                grade: extractFieldFromJob(job, "student grade"),
                lesson_frequency: extractFieldFromJob(job, "lesson frequency"),
                needed_subjects: extractFieldFromJob(job, "classes needed tutoring in"),
                location: inPerson ? extractFieldFromJob(job, ["home address (if in person lessons)", "home address"]) : undefined,
            };
        }
    }
    
    statusMap[job.status][job.id] = job;
};


export const syncStatusMap = async () => {
    Log.info("syncing status map");
    const twoMonthsAgo = new Date(new Date().getTime() - Duration.hour(24 * 7 * 4 * 2).milliseconds).toISOString();

    // loop through each page
    for(let page = 1; ; page++) {
        Log.debug(`Syncing status map page ${page}`);
        const currResp: ManyResponse<DumbJob> = (await ApiFetcher.sendRequest(`/services?last_updated_gte=${twoMonthsAgo}&page=${page}`)).data;

        for(let i = 0; i < currResp.results.length; i++) {
            Log.debug(`Syncing job ${(page - 1) * 100 + i}`);
            await updateStatusJob(currResp.results[i]);
        }

        if(currResp.next === null)
            break;
    }
};
