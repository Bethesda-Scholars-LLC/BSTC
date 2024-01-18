import express from "express";
import { runAlgo } from "../algo/algo";
import { JobObject } from "../integration/tc models/service/types";
import { contractorIncompleteVerify } from "../mail/contractorIncomplete";
import { Req, Res } from "../types";
import { Log, PROD } from "../util";
import ApiFetcher from "./fetch";

const apiRouter = express.Router();
apiRouter.use(express.json());

type ErrorMsg = {
    error: string
};

function errorMsg(msg: string): ErrorMsg {
    return {
        error: msg
    };
}

if(!PROD) {
    apiRouter.get("/contractorIncomplete", async (req: Req, res: Res) => {
        const result = await contractorIncompleteVerify(parseInt(req.query.id as any));
        Log.debug(result);
        res.send(result);
    });
}

const findTutorTypes = {
    "job_id": "number",
    "subject": "string",
    "stars": "number",
    "only_college": "boolean"
};
apiRouter.post("/find/tutor", async (req: Req, res: Res) => {
    const tutorTypes = Object.entries(findTutorTypes);
    for(let i = 0; i < tutorTypes.length; i++) {
        if(typeof (req.body as any)[tutorTypes[i][0]] !== tutorTypes[i][1])
            return res.status(400).json(errorMsg(`invalid type of "${tutorTypes[i][0]}"`));
    }

    let service: JobObject;
    try {
        service = (await ApiFetcher.sendRequest(`/services/${req.body.job_id}/`)).data;
    } catch (e) {
        return res.status(500).json(errorMsg("something went wrong sending your request"));
    }

    const tutors = await runAlgo(service, req.body.subject, req.body.stars, req.body.only_college);

    res.json({service_name: service.name, tutors, ...req.body});
});

export default apiRouter;