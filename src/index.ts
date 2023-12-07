import cors from "cors";
import express, { json } from "express";
import mongoose from "mongoose";
import "./algo/algo";
import apiRouter from "./api/api";
import tutorAvailRouter from "./api/tutoravailability";
import hookRouter from "./integration/hook";
import "./integration/tc models/contractor/contractor";
import "./integration/tc models/service/service";
import "./mail/mail";
import "./scripts";
import { Req } from "./types";
import { DB_URI, Log, PROD, TEST } from "./util";

const main = () => {

    mongoose.connect(DB_URI).then(() => {
        Log.debug(`Connected to ${(PROD ? process.env.DB_NAME : process.env.DB_DEV_NAME)}`);
    }).catch(Log.error);

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
};

if(!TEST)
    main();
