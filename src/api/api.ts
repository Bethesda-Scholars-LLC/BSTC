import express from "express";
import { contractorIncompleteVerify } from "../mail/contractorIncomplete";
import { Req, Res } from "../types";
import { Log, PROD } from "../util";

const apiRouter = express.Router();
apiRouter.use(express.json());


if(!PROD) {
    apiRouter.get("/contractorIncomplete", async (req: Req, res: Res) => {
        const result = await contractorIncompleteVerify(parseInt(req.query.id as any));
        Log.debug(result);
        res.send(result);
    });
}

export default apiRouter;