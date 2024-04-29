import * as turf from "@turf/turf";
import { PipelineStage } from "mongoose";
import { AlgoFilters, ApiErrorMsg, errorMsg } from "../api/api";
import { GeoResponse, geocode } from "../geo";
import { JobObject } from "../integration/tc models/service/types";
import TutorModel, { ITutor } from "../models/tutor";
import { capitalize } from "../util";
import "./applicationSync";
import "./contractorSync";
import { gradePossibilities } from "./contractorSync";
import "./lessonSync";
import "./syncDB";

export interface JobInfo {
    locationInfo?: GeoResponse | null,
    studentGrade: string,
    classesNeededTutoringIn: string,
    isOnline: boolean,
    schoolName?: string
}

export type AlgoTutor = ITutor & {
    estimated_distance?: number
}

export type AlgoResult = {
    biased_tutors: ITutor[],
    merit_tutors: ITutor[]
};

// measured in miles
// const CUTOFF_DIST = 10;

export const extractFieldFromJob = (job: JobObject, field: string): string | undefined => {
    const splBio = job.description.toLowerCase().split("\n").map(val => val.trim());
    let ind = splBio.indexOf(`**${field.toLowerCase()}:**`);
    if(ind === -1)
        ind = splBio.indexOf(`${field.toLowerCase()}:`);
    if(ind === -1)
        ind = splBio.indexOf(`${field.toLowerCase()}`);

    return ind !== -1 ? splBio[ind+1].trim() : undefined;
};

export const getJobInfo = async (job: JobObject): Promise<JobInfo> => {
    const location = extractFieldFromJob(job, "lesson location")?.toLocaleLowerCase();
    const address = extractFieldFromJob(job, "home address") ?? extractFieldFromJob(job, "Home address (if in person lessons)")!;
    const zipCode = extractFieldFromJob(job, "zip code");
    const isOnline = location === "either" ? true : location !== "in-person lessons at my house";

    return {
        locationInfo: isOnline ? undefined : ((await geocode(address + " " + zipCode))[0]??null),
        studentGrade: extractFieldFromJob(job, "student grade")!,
        classesNeededTutoringIn: extractFieldFromJob(job, "classes needed tutoring in")!,
        schoolName: (extractFieldFromJob(job, "school full name") ?? extractFieldFromJob(job, "Student school's full name") ?? "").split(" ").map(val => capitalize(val)).join(" "),
        isOnline,
    };
};

export const runAlgo = async (jobInfo: JobInfo, filters: AlgoFilters): Promise<{tutors: AlgoTutor[], warning?: string} | ApiErrorMsg> => {
    const location: "virtual" | "in-person" | "both" = filters.lesson_location === "from-lesson" ? (jobInfo.isOnline ? "virtual" : "in-person") : filters.lesson_location;
    const failed: {
        [key: number]: ITutor[]
    } = {};
    const passed: AlgoTutor[] = [];
    const pipeline: PipelineStage[] = [
        {$match: {status: "approved", grade: {$gte: gradePossibilities[jobInfo.studentGrade]!+2}}},
    ];
    if(filters.stars !== undefined && filters.stars !== null) {
        (pipeline[0] as any)["$match"].stars = {$eq: filters.stars};
    }
    if(location === "in-person" && filters.only_college) {
        return errorMsg("only_college enabled on in person job listing", "Cannot filter for college only and in person at the same time");
    }
    if(location === "in-person" || filters.only_high_school)
        pipeline.push({$match: {grade: {$lt: 13}}});
    


    const tutors = await TutorModel.aggregate(pipeline).exec();
    for(let i = 0; i < tutors.length; i++) {
        const filterRes = filterTutor(jobInfo, location, tutors[i], filters);
        if(typeof filterRes === "number") {
            if(!failed[filterRes])
                failed[filterRes] = [tutors[i]];
            else
                failed[filterRes].push(tutors[i]);
            continue;
        }
        passed.push(filterRes);
    }

    return {
        tutors: passed,
        warning: jobInfo.locationInfo === null ? "Unable to get lesson location, check bio for zip code field" : undefined,
    };
};

const filterTutor = (jobInfo: JobInfo, location: "virtual" | "in-person" | "both", tutor: ITutor, filters: AlgoFilters): number | AlgoTutor => {
    let dist = undefined;
    let i = 1;
    if(!filters.subjects.reduce((prev, curr) => prev && tutor.skills.map(val => val.subject).includes(curr), true))
        return i;
    i++;
    if(jobInfo.locationInfo && location !== "virtual") {
        if(tutor.lat && tutor.lon) {
            const tutorLocation = turf.point([tutor.lon, tutor.lat]);
            const jobLocation = turf.point([parseFloat(jobInfo.locationInfo.lon), parseFloat(jobInfo.locationInfo.lat)]);
            dist = turf.distance(tutorLocation, jobLocation, "miles");
            if(location === "in-person" && dist > 10) {
                return i;
            }
        } else if (location === "in-person") {
            return i;
        }
    }
    i++;
    if(filters.recent_hours_cutoff && filters.recent_hours_cutoff > 0 && tutor.recent_hours >= filters.recent_hours_cutoff && tutor.bias === 0) {
        return i;
    }
    i++;
    if(location === "in-person" && (tutor?.grade ?? 13) > 12)
        return i;
    i++;
    if(filters.only_college && (tutor?.grade ?? 12) < 13)
        return i;

    return {...tutor, estimated_distance: dist};
};
