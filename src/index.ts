import axios from "axios";
import cors from "cors";
import express, { json } from "express";
import hookRouter, { addTCListener } from "./hook";
import { JobObject, TCEvent } from "./types";
import { apiHeaders, apiUrl } from "./util";
const app = express();
app.use(cors());
app.use(json());

const updateServiceById = (id: number, data: any) => {
    axios(apiUrl(`/services/${id}/`), {
        method: "PUT",
        headers: apiHeaders,
        data: data
    }).then(v => {
        console.log(v);
    }).catch(err => {
        console.error(err);
        console.error("ERROR");
    });
};

addTCListener("REQUESTED_A_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const job = event.subject;

    // if name has only one word in it, return and exit
    if(job.name.split("from")[1].trim().split(" ").length === 1)
        return;

    const name = job.name.split("from")[1]
        .trim()
        .split(" ")
        .filter((_v: string, i: number, arr: string[]) => {
            return i === 0 || i === arr.length-1;
        }).map((v: string, i: number) => {
            if(i === 0)
                return v;
            return v.charAt(0).toUpperCase()+".";
        }).join(" ");

    job.name = job.name.split("from")[0]+"from "+name;
    updateServiceById(job.id, {
        name: job.name,
        "dft_charge_rate": job.dft_charge_rate,
        "dft_contractor_rate": job.dft_contractor_rate
    });
});

app.use("/hook", hookRouter);

app.listen(80);
