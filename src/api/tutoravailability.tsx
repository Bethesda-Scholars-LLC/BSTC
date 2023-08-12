import express from "express";
import { Req, Res } from "../types";
import path from "path";
import { getContractorById, popTutorFromCAs } from "../integration/tc models/contractor/contractor";
const tutorAvailRouter = express.Router();


tutorAvailRouter.get("/", async (req: Req, res: Res) => {
    const tutorId = parseInt(req.query?.code as any);
    if(req.query?.code && !isNaN(tutorId)) {
        const contractor = await getContractorById(tutorId);
        if(!contractor)
            return res.redirect("https://google.com");
        
        popTutorFromCAs(contractor);
    } else
        return res.redirect("https://google.com");
    

    res.sendFile(path.join( __dirname, "..", "..", "public", "tutorRedirect.html"));
});

export default tutorAvailRouter;