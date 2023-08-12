import cors from "cors";
import express, { json } from "express";
import "./integration/tc models/contractor/contractor";
import hookRouter from "./integration/hook";
import "./integration/tc models/service/service";
import "./mail/mail";
import "./scripts";
import { DB_URI, Log, PROD } from "./util";
import { Req } from "./types";
import mongoose from "mongoose";
import { getRandomClient } from "./integration/tc models/client/client";
import { getRandomContractor } from "./integration/tc models/contractor/contractor";
import { getRandomService } from "./integration/tc models/service/service";
import tutorMatchedMail from "./mail/tutorMatched";
import { transporter } from "./mail/mail";
import tutorAvailRouter from "./api/tutoravailability";

mongoose.connect(DB_URI).then(() => { // eslint-disable-line
    Log.debug(`Connected to ${(PROD ? process.env.DB_NAME : process.env.DB_TEST_NAME)}`);
}).catch(Log.error);

(async () => {
    transporter.sendMail(
        tutorMatchedMail((await getRandomContractor())!, await getRandomClient(), (await getRandomService())!), //eslint-disable-line
        (err) => {
            if(err)
                Log.error(err);
        }
    );
})();


const app = express();
app.use(cors());
app.use(json({
    verify: (req: Req, _, buf) => {
        req.rawBody = buf.toString();
    },
}));

app.use("/hook", hookRouter);
app.use("/tutoravailability", tutorAvailRouter);

app.listen(80, () => {
    Log.debug("Ready to go");
});
