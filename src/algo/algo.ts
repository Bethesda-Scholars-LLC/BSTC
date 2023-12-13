import { geocode } from "../geo";
import { SessionLocation, getRandomService } from "../integration/tc models/service/service";
import { JobObject } from "../integration/tc models/service/types";
import TutorModel, { ITutor } from "../models/tutor";
import { Log, binarySearch } from "../util";
import "./contractorSync";
import { gradePossibilities } from "./contractorSync";
import "./lessonSync";
import "./syncDB";

const extractFieldFromJob = (job: JobObject, field: string): string | undefined => {
    const splBio = job.description.toLowerCase().split("\n");
    const ind = splBio.indexOf(`**${field.toLowerCase()}:**`);

    return ind !== -1 ? splBio[ind+1] : undefined;
};

const convertLatLon = (val: {lat: number, lon: number}): {x: number, y: number} => {
    return {x: val.lat*69, y: val.lon*54.6};
};

const calcDist = (p1: {x: number, y: number}, p2: {x: number, y: number}): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// negative sigmoid function approaching 1 from 1.1
const recentHoursFunc = (hours: number): number => -0.1/(1 + Math.pow(Math.E, -0.5*(hours-10))) + 1.1;
// negative linear with hard cutoff at 25
const distFunc = (dist: number): number => dist > 25 ? 0 : Math.max(-(dist/25) + 2, 0);
// linear positive after 3.75
const gpaFunc = (gpa: number): number => Math.max(gpa/20+0.8, 1);

const gradeDiffFunc = (diff: number): number => {
    if(diff <= 0)
        return 0;
    if(diff >= 2)
        return 1.1;
    return 1;
};

/*
    // hard filter 2 year gap
    grade?: number,

    // undefined so far
    bias: number,

    // 4 can tutor AP level or high level like calc
    // 3 high school subjects (bio, chem, alg 2, precalc)
    // 2 low level subjects
    // 1 good with kids
    stars?: number,

    // weigh same gender closer
    gender?: number,

    // weigh tutors with skill 10% better
    skills: TutorSkill[],
*/

const testRandomJob = async () => {
    const job = await getRandomService();
    if(!job)
        return;

    const tutorsGraded: (ITutor & {score: number})[] = [];
    const tutors = await TutorModel.find({status: "approved"}).exec();
    const address = extractFieldFromJob(job, "home address");
    let coords: {x: number, y: number} | undefined;
    if(address) {
        const results = await geocode(address.includes("nw") ? address.trim() + " Washington DC" : address.trim());
        if(results.length > 0) {
            coords = convertLatLon({
                lat: parseFloat(results[0].lat),
                lon: parseFloat(results[0].lon)
            });
        }
    }
    const onlineJob = job.dft_location?.id === SessionLocation.Online;



    for(let i = 0; i < tutors.length; i++) {
        const tutor = tutors[i];
        const tGrade = await gradeTutor(tutor, job, coords);
        if(!tGrade)
            continue;
        tutorsGraded.splice(binarySearch(tutorsGraded, (t) => t.score-tGrade)+1, 0, {
            ...tutor,
            score: tGrade
        });
    }
    Log.debug("Lesson location: " + (onlineJob ? "Online" : "In Person"));
    for(let i = 14; i >= 0; i--) {
        const t = (tutorsGraded[i] as any)._doc;
        Log.debug(`#${i+1} ${t.first_name} ${t.last_name}: ${(tutorsGraded[0] as any).score}`);
    }
    
};

const gradeTutor = async (tutor: ITutor, job: JobObject, jobCoords: {x: number, y: number} | undefined): Promise<number | null> => {
    const onlineJob = job.dft_location?.id === SessionLocation.Online;
    const grade = gradePossibilities[extractFieldFromJob(job, "student grade")!]; // eslint-disable-line
    let score = 1;

    if(!onlineJob && jobCoords) {
        if(!tutor.lat || !tutor.lon){
            Log.debug("no lat or lon");
            return null;
        }
        score *= distFunc(calcDist(convertLatLon(tutor as any), jobCoords));
    }
    if(tutor.grade)
        score *= gradeDiffFunc(tutor.grade-grade);
    score *= recentHoursFunc(tutor.total_paid_hours ?? 0);
    score *= recentHoursFunc(tutor.recent_hours ?? 0);
    score *= gpaFunc(tutor.gpa ?? 1);
    return score;
};

// testRandomJob();
