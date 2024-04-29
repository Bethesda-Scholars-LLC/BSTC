import { Duration } from "ts-duration";
import { addTCListener } from "../integration/hook";
import { DumbJob, JobObject } from "../integration/tc models/service/types";
import { ManyResponse, Req, Res, TCEvent } from "../types";
import { Log } from "../util";
import { errorMsg } from "./api";
import ApiFetcher from "./fetch";

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


type MapJob = DumbJob | JobObject;

const statusMap: {
    [status: string]: {
        [job_id: string]: MapJob
    }
} = { };

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

export const updateStatusJob = (job: MapJob) => {
    const statusList = Object.keys(statusMap);

    for(let i = 0; i < statusList.length; i++) {
        delete statusMap[statusList[i]][job.id];
    }

    if(!job.status) {
        return;
    }
    if(!statusMap[job.status])
        statusMap[job.status] = {};
    
    statusMap[job.status][job.id] = job;
    Log.debug(Object.fromEntries(Object.entries(statusMap).map(([status, jobs]) => [status, Object.keys(jobs)])));
};


const syncStatusMap = async () => {
    const twoMonthsAgo = new Date(new Date().getTime() - Duration.hour(24 * 7 * 4 * 2).milliseconds).toISOString();

    // loop through each page
    for(let page = 1; ; page++) {
        const currResp: ManyResponse<DumbJob> = (await ApiFetcher.sendRequest(`/services?last_updated_gte=${twoMonthsAgo}&page=${page}`)).data;

        for(let i = 0; i < currResp.results.length; i++)
            updateStatusJob(currResp.results[i]);

        if(currResp.next === null)
            break;
    }
};

syncStatusMap();

addTCListener("CREATED_A_SERVICE", async (ev: TCEvent<JobObject>) => {
    const service = ev.subject;
    updateStatusJob(service);
});

addTCListener("CHANGED_SERVICE_STATUS", async (event: TCEvent<JobObject>) => {
    const job = event.subject;
    updateStatusJob(job);
});