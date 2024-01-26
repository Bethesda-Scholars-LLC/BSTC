import express from "express";
import { runAlgo } from "../algo/algo";
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

export interface AlgoFilters {
    stars: number,
    subjects: string[],
    only_college: boolean,
    ignore_in_person: boolean
}
const findTutorTypes = {
    "job_id": "number",
    "subjects": "[string]",
    "stars": "number",
    "only_college": "boolean",
    "ignore_in_person": "boolean"
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

apiRouter.post("/find/tutor", async (req: Req, res: Res) => {
    const tutorTypes = Object.entries(findTutorTypes);
    for(let i = 0; i < tutorTypes.length; i++) {
        const fieldName = tutorTypes[i][0];
        const expectedFieldType = tutorTypes[i][1];
        const optional = fieldName.endsWith("?");

        if(!verifyField(optional, req.body[fieldName], expectedFieldType))
            return res.status(400).json(errorMsg(`invalid type of "${fieldName}" expected ${expectedFieldType}`));
    }

    let service: JobObject;
    try {
        service = (await ApiFetcher.sendRequest(`/services/${req.body.job_id}/`)).data;
    } catch (e) {
        return res.status(500).json(errorMsg("tutor cruncher request failed", "Could not search for Job ID Provided"));
    }

    const tutors = await runAlgo(service, req.body);
    
    if(!Array.isArray(tutors)) {
        return res.json(tutors);
    }

    res.json({service_name: service.name, tutors, ...req.body});
});

export default apiRouter;