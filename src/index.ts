import cors from "cors";
import express, { json } from "express";
import mongoose from "mongoose";
import apiRouter from "./api/api";
import tutorAvailRouter from "./api/tutoravailability";
import hookRouter from "./integration/hook";
import "./integration/tc models/contractor/contractor";
import "./integration/tc models/service/service";
import "./mail/mail";
import "./scripts";
import { Req } from "./types";
import { DB_URI, Log, PROD } from "./util";

mongoose.connect(DB_URI).then(() => { // eslint-disable-line
    Log.debug(`Connected to ${(PROD ? process.env.DB_NAME : process.env.DB_TEST_NAME)}`);
}).catch(Log.error);

/* RATE LIMIT TESTING
(async () => {
    const contractors: ManyResponse<DumbUser> = (await ApiFetcher.sendRequest("/contractors"))?.data;
    if(!contractors)
        return;
    for(let i = 0; i < 101; i++) {
        const currId = contractors.results[i % contractors.count].id;
        ApiFetcher.sendRequest(`/contractors/${currId}`);
    }
})(); */

const app = express();
app.use(cors());
app.use(json({
    verify: (req: Req, _, buf) => {
        req.rawBody = buf.toString();
    },
}));

app.use("/api", apiRouter);
app.use("/hook", hookRouter);
app.use("/tutoravailability", tutorAvailRouter);

app.listen(process.env.PORT ?? 80, () => {
    Log.debug("Ready to go");
});
