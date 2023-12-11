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

const testRandomJob = async () => {
    const job = await getRandomService();
    if(!job)
        return;
    Log.debug(extractFieldFromJob(job, "classes needed tutoring in"));
    const address = extractFieldFromJob(job, "home address");
    if(address){
        Log.debug(address.trim() + " maryland, united states");
        // const results = await geocode(address.trim() + " maryland, united states");
    }
};
