import * as turf from "@turf/turf";
import { PipelineStage } from "mongoose";
import { AlgoFilters, ApiErrorMsg, errorMsg } from "../api/api";
import { GeoResponse, geocode } from "../geo";
import { JobObject } from "../integration/tc models/service/types";
import TutorModel, { ITutor } from "../models/tutor";
import { Log } from "../util";
import "./applicationSync";
import "./contractorSync";
import { gradePossibilities } from "./contractorSync";
import "./lessonSync";
import "./syncDB";

export interface JobInfo {
    locationInfo?: GeoResponse,
    studentGrade: number,
    classesNeededTutoringIn: string,
    isOnline: boolean,
}

export type AlgoTutor = ITutor & {
    estimated_distance?: number
}

// measured in miles
const CUTOFF_DIST = 10;

const extractFieldFromJob = (job: JobObject, field: string): string | undefined => {
    const splBio = job.description.toLowerCase().split("\n").map(val => val.trim());
    const ind = splBio.indexOf(`**${field.toLowerCase()}:**`);

    return ind !== -1 ? splBio[ind+1].trim() : undefined;
};

const getJobInfo = async (job: JobObject): Promise<JobInfo> => {
    const location = extractFieldFromJob(job, "lesson location")?.toLocaleLowerCase();
    const address = extractFieldFromJob(job, "home address") ?? extractFieldFromJob(job, "Home address (if in person lessons)")!;
    const zipCode = extractFieldFromJob(job, "zip code");
    const isOnline = location === "either" ? true : location !== "in-person lessons at my house";

    return {
        locationInfo: isOnline ? undefined : (await geocode(address + " " + zipCode))[0],
        studentGrade: gradePossibilities[extractFieldFromJob(job, "student grade")!.toLowerCase()]!,
        classesNeededTutoringIn: extractFieldFromJob(job, "classes needed tutoring in")!,
        isOnline,
    };
};

export const runAlgo = async (job: JobObject, filters: AlgoFilters): Promise<AlgoTutor[] | ApiErrorMsg> => {
    Log.debug(filters);
    const jobInfo = await getJobInfo(job);
    if(filters.ignore_in_person) {
        jobInfo.isOnline = true;
    }
    const failed: {
        [key: number]: ITutor[]
    } = {};
    let passed: AlgoTutor[] = [];
    const pipeline: PipelineStage[] = [
        {$match: {status: "approved", grade: {$gte: jobInfo.studentGrade+2}, stars: {$eq: filters.stars}}},
    ];
    if(!jobInfo.isOnline && filters.only_college) {
        return errorMsg("only_college enabled on in person job listing", "Cannot filter for college only on in person job");
    }
    if(!jobInfo.isOnline) {
        pipeline.push({$match: {grade: {$lt: 13}}});
    }


    const tutors = await TutorModel.aggregate(pipeline).exec();
    for(let i = 0; i < tutors.length; i++) {
        const filterRes = filterTutor(jobInfo, tutors[i], filters);
        if(typeof filterRes === "number") {
            if(!failed[filterRes])
                failed[filterRes] = [tutors[i]];
            else
                failed[filterRes].push(tutors[i]);
            continue;
        }
        passed.push(filterRes);
    }
    passed = passed.filter((_val, i) => i < CUTOFF_DIST);
    if(!jobInfo.isOnline) {
        passed.sort((t1, t2) => (t1.estimated_distance ?? Infinity) -(t2.estimated_distance ?? Infinity));
    }

    return passed;
};

const filterTutor = (jobInfo: JobInfo, tutor: ITutor, filters: AlgoFilters): number | AlgoTutor => {
    let dist = undefined;
    let i = 1;
    if(!filters.subjects.reduce((prev, curr) => prev && tutor.skills.map(val => val.subject).includes(curr), true))
        return i;
    i++;
    if(jobInfo.locationInfo && !jobInfo.isOnline) {
        if(!tutor.lat || !tutor.lon)
            return i;
        const tutorLocation = turf.point([tutor.lon, tutor.lat]);
        const jobLocation = turf.point([parseFloat(jobInfo.locationInfo.lon), parseFloat(jobInfo.locationInfo.lat)]);
        dist = turf.distance(tutorLocation, jobLocation, "miles");
        if(dist > 10) {
            return i;
        }
    }
    i++;
    if(!jobInfo.isOnline && (tutor?.grade ?? 13) > 12)
        return i;
    i++;
    if(filters.only_college && (tutor?.grade ?? 12) < 13)
        return i;

    return {...tutor, estimated_distance: dist};
};
