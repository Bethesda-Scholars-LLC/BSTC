import cors from "cors";
import express, { json } from "express";
import "./integration/contractor";
import hookRouter from "./integration/hook";
import "./integration/service";
import "./mail/mail";
import { ContractorObject } from "./integration/contractorTypes";
import axios, { all } from "axios";
import { apiHeaders, apiUrl } from "./util";
import { getContractorById, setContractorPhone } from "./integration/contractor";
const app = express();
app.use(cors());
app.use(json());

app.use("/hook", hookRouter);

const getAllContractors = async (): Promise<ContractorObject | null> => {
    try {
        return (await axios(apiUrl("/contractors/?page=2"), {
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
        let i;
        
        // change the lenght of iteration so API limit doesnt get hit 
        // also change page in get request after 100
        for (i = 0; i < allContractors.results.length; i++) {
            getContractorById(allContractors.results[i].id).then(contractor => {
                // this should be the function that each contractor
                // setContractorPhone(contractor);
                console.log(contractor?.user.first_name);
            });
        }
    } catch (error) {
        console.log("Error: ", error);
    }
};
// editAllContractors();


app.listen(80);
