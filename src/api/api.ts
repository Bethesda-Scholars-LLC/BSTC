import express from "express";
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

apiRouter.post("/find/tutor", async (req: Req, res: Res) => {
    if(typeof req.body.job_id !== "number") {
        return res.status(400).json(errorMsg("invalid type of \"job_id\""));
    } if(typeof req.body.subject !== "string") {
        return res.status(400).json(errorMsg("invalid type of \"subject\""));
    } if(typeof req.body.stars !== "number") {
        return res.status(400).json(errorMsg("invalid type of \"stars\""));
    }
    let service: JobObject;
    try {
        service = (await ApiFetcher.sendRequest(`/services/${req.body.job_id}/`)).data;
    } catch (e) {
        return res.status(500).json(errorMsg("something went wrong sending your request"));
    }

    res.json({name: service.name});
});

export default apiRouter;