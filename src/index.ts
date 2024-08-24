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
import { DB_URI, Log, PROD, RUN_SCRIPTS, TEST } from "./util";
import { syncStatusMap } from "./api/status_track";

const main = async () => {
    try {
        await mongoose.connect(DB_URI).then(() => {
            Log.debug(`Connected to ${(PROD || RUN_SCRIPTS ? process.env.DB_NAME : process.env.DB_DEV_NAME)}`);
        }).catch(Log.error);

        const app = express();
        app.use(cors());
        app.use(json({
            verify: (req: Req, _, buf) => {
                req.rawBody = buf.toString();
            },
        }));

        app.use("/pub", express.static("public"));
        app.use("/app/*", express.static("public/dist"));
        app.use("/api", apiRouter);
        app.use("/tutoravailability", tutorAvailRouter);

        Log.debug("Starting status map synchronization...");
        await syncStatusMap();
        Log.debug("Status map synchronization complete.");

        app.use("/hook", hookRouter);


        app.listen(process.env.PORT ?? 80, () => {
            Log.debug("Ready to go");
        });
    } catch (err) {
        Log.error(`Error starting server: ${err}`);
    }
};

if(!TEST)
    main();

