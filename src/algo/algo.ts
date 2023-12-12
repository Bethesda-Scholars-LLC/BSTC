import { geocode } from "../geo";
import { getRandomService } from "../integration/tc models/service/service";
import { JobObject } from "../integration/tc models/service/types";
import { Log } from "../util";
import "./contractorSync";
import "./lessonSync";

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

const recentHoursCalc = (hours: number): number => -0.5/(1 + Math.pow(Math.E, -0.5*(hours-10))) + 1.5;

/*
    // exponentially drops off, 25 mins should be 0
    lat?: number,
    lon?: number,

    // hard filter 2 year gap
    grade?: number,

    // undefined so far
    bias: number,

    // 4 can tutor AP level or high level like calc
    // 3 high school subjects (bio, chem, alg 2, precalc)
    // 2 low level subjects
    // 1 good with kids
    stars?: number,

    // negative sigmoid
    recent_hours: number,

    // 0 is positively weighed
    total_paid_hours?: string,

    // weigh same gender closer
    gender?: number,

    // weigh tutors with skill 10% better
    skills: TutorSkill[],
    // piecewise but you don't lose for having bad gpa
    gpa?: number,
*/

const _testRandomJob = async () => {
    const job = await getRandomService();
    if(!job)
        return;
    Log.debug(extractFieldFromJob(job, "classes needed tutoring in"));
    const address = extractFieldFromJob(job, "home address");
    let coords: {x: number, y: number} | undefined;
    if(address) {
        Log.debug(address);
        const results = await geocode(address.includes("nw") ? address.trim() + " Washington DC" : address.trim());
        if(results.length > 0) {
            Log.debug(results[0]);
            coords = convertLatLon({
                lat: parseFloat(results[0].lat),
                lon: parseFloat(results[0].lon)
            });
        }
    }
    /*
    const onlineJob = job.dft_location.id === SessionLocation.Online;
    const tutors: (ITutor & {score?: number})[] = await TutorModel.find({status: "approved"}).exec();
    for(let i = 0; i < tutors.length; i++) {
        const tutor = tutors[i];
        if(!onlineJob && coords) {
            if(!tutor.lat || !tutor.lon)
                continue;
            calcDist(convertLatLon(tutor as any), coords);
        }

    }*/
};

// testRandomJob();
