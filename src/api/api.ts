import express from "express";
import { getJobInfo, runAlgo } from "../algo/algo";
import { JobObject } from "../integration/tc models/service/types";
import { contractorIncompleteVerify } from "../mail/contractorIncomplete";
import { Req, Res } from "../types";
import { Log, PROD } from "../util";
import ApiFetcher from "./fetch";

const apiRouter = express.Router();
apiRouter.use(express.json());

export type ApiErrorMsg = {
    error: string,
    userMessage: string
};

export function errorMsg(msg: string, userMessage?: string): ApiErrorMsg {
    return {
        error: msg,
        userMessage: userMessage ?? "Something went wrong"
    };
}

if(!PROD) {
    apiRouter.get("/contractorIncomplete", async (req: Req, res: Res) => {
        const result = await contractorIncompleteVerify(parseInt(req.query.id as any));
        Log.debug(result);
        res.send(result);
    });
}

const lessonLocations = ["in-person", "virtual", "both", "from-lesson"];

export interface AlgoFilters {
    subjects: string[],
    stars?: number,
    recent_hours_cutoff?: number,
    lesson_location: "in-person" | "virtual" | "both" | "from-lesson",
    only_high_school: boolean,
    only_college: boolean,
}

const findTutorTypes = {
    "job_id": "number",
    "subjects": "[string]",
    "stars?": "number",
    "recent_hours_cutoff?": "number",
    "lesson_location": "string",
    "only_high_school": "boolean",
    "only_college": "boolean",
};

const verifyField = (optional: boolean, field: any, expectedType: string): boolean => {
    const fieldType = typeof field;
    if(optional && fieldType === "undefined")
        return true;
    if(expectedType.match(/^(\[)+(string|number|boolean)(\])+$/)) {
        if(!Array.isArray(field))
            return false;
        const innerExpectedFieldType = expectedType.substring(0, expectedType.length-1).substring(1);
        return field.reduce((prev: boolean, curr: any) => {
            return prev && verifyField(false, curr, innerExpectedFieldType);
        }, true);
    }
    return fieldType === expectedType;
};

apiRouter.get("/", async (_req: Req, res: Res) => {
    res.json({});
});

const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");

apiRouter.post("/find/tutor", async (req: Req, res: Res) => {
    const tutorTypes = Object.entries(findTutorTypes);
    for(let i = 0; i < tutorTypes.length; i++) {
        const fieldName = tutorTypes[i][0];
        const expectedFieldType = tutorTypes[i][1];
        const optional = fieldName.endsWith("?");

        if(!verifyField(optional, req.body[fieldName], expectedFieldType))
            return res.status(400).json(errorMsg(`invalid type of "${fieldName}" expected ${expectedFieldType}`));
    }
    if(req.body.only_high_school && req.body.only_college)
        return res.status(400).json(errorMsg("only_high_school and only_college cannot both be true"));
    
    if(!lessonLocations.includes(req.body.lesson_location))
        return res.status(400).json(errorMsg(`invalid lesson_location "${req.body.lesson_location}"`));

    let service: JobObject;
    try {
        service = (await ApiFetcher.sendRequest(`/services/${req.body.job_id}/`)).data;
    } catch (e) {
        Log.error(e);
        return res.status(500).json(errorMsg("tutor cruncher request failed", "Could not search for Job ID Provided"));
    }
    const jobInfo = await getJobInfo(service);

    const inPerson = !jobInfo.isOnline;
    const tutors = await runAlgo(jobInfo, req.body);

    
    if(!("tutors" in tutors)) {
        return res.json({...tutors, id: genRanHex(8) });
    }

    res.json({
        id: genRanHex(16),
        service_name: service.name,
        is_in_person: inPerson,
        student_name: service.rcrs[0].recipient_name,
        student_grade: jobInfo.studentGrade,
        school_full_name: jobInfo.schoolName,
        ...tutors,
        ...req.body
    });
});

export default apiRouter;