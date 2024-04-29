import { Duration } from "ts-duration";
import { addTCListener } from "../integration/hook";
import { getServiceById } from "../integration/tc models/service/service";
import { DumbJob, JobObject } from "../integration/tc models/service/types";
import { ManyResponse, Req, Res, TCEvent } from "../types";
import { Log } from "../util";
import { errorMsg } from "./api";
import ApiFetcher from "./fetch";

// type JobStatus = "pending" | "in-progress" | "available" | "finished" | "gone-cold";

/**
 * @route /api/job/status
 */
export const GETJobsByStatus = async (req: Req, res: Res) => {
    const status = req.query.s?.toString();
    if(!status || !["pending", "in-progress", "available", "finished", "gone-cold"].includes(status))
       return res.status(400).json(errorMsg("query field \"s\" invalid"));
    const jobs = getJobsWithStatus(status);
    res.json({
        count: jobs.length,
        jobs
    });
};


type MapJob = DumbJob | JobObject & {
    details?: {
        student_name?: string,
        grade?: string,
        lesson_frequency?: string,
        needed_subjects?: string,
        location?: string,
    }
};

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


export const updateStatusJob = async (job: MapJob) => {
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
    if(job.status === "available" && !isFullJob(job)) {
        try {
            const newJob = await getServiceById(job.id);

            if(newJob)
                job = newJob;
        } catch (e) {
            Log.error(e);
        }
    }
    
    statusMap[job.status][job.id] = job;
};


const syncStatusMap = async () => {
    const twoMonthsAgo = new Date(new Date().getTime() - Duration.hour(24 * 7 * 4 * 2).milliseconds).toISOString();

    // loop through each page
    for(let page = 1; ; page++) {
        const currResp: ManyResponse<DumbJob> = (await ApiFetcher.sendRequest(`/services?last_updated_gte=${twoMonthsAgo}&page=${page}`)).data;

        for(let i = 0; i < currResp.results.length; i++)
            await updateStatusJob(currResp.results[i]);

        if(currResp.next === null)
            break;
    }
};

syncStatusMap();

addTCListener("CREATED_A_SERVICE", async (ev: TCEvent<JobObject>) => {
    const service = ev.subject;
    await updateStatusJob(service);
});

addTCListener("CHANGED_SERVICE_STATUS", async (event: TCEvent<JobObject>) => {
    const job = event.subject;
    await updateStatusJob(job);
});