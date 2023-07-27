import axios from "axios";
import cors from "cors";
import express, { json } from "express";
import "./integration/contractor";
import { getContractorById, setLookingForJob } from "./integration/contractor";
import { ContractorObject } from "./integration/contractorTypes";
import hookRouter from "./integration/hook";
import "./integration/service";
import "./mail/mail";
import { Req, Res } from "./types";
import { apiHeaders, apiUrl, getAttrByMachineName, stallFor } from "./util";
const app = express();
app.use(cors());
app.use(json());

app.use("/hook", hookRouter);

const getAllContractors = async (): Promise<ContractorObject | null> => {
    try {
        return (await axios(apiUrl("/contractors?page=2"), {
            headers: apiHeaders
        })).data;
    } catch(e) {
        console.log(e);
        return null;
    }
};

// function that edits all contractors
const editAllContractors = async () => {
    try {
        const allContractors: any = await getAllContractors();
        
        // change the lenght of iteration so API limit doesnt get hit
        // also change page in get request after 100
        for (let i = 0; i < allContractors.results.length; i++) {
            const contractor = await getContractorById(allContractors.results[i].id);

            if(!contractor)
                return;

            console.log(`checking ${contractor.user.first_name} ${contractor.user.last_name}`);

            // this should be the function that each contractor
            if(contractor.labels.reduce((prev, v) => prev || v.machine_name === "looking-for-job", false) &&
                !getAttrByMachineName("looking_for_job", contractor.extra_attrs)){
                console.log(contractor.user.first_name+" "+contractor.user.last_name);
                await setLookingForJob(contractor, true);
            }
            await stallFor(1000);
        }
    } catch (error) {
        console.log("Error: ", error);
    }
};

// editAllContractors();

app.get("/api", (_req: Req, res: Res) => {
    res.send("auto redeploy!");
});

app.listen(80);
