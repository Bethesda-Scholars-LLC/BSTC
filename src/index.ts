import cors from "cors";
import express, { json } from "express";
import mongoose from "mongoose";
import path from "path";
import "./algo/algo";
import apiRouter from "./api/api";
import { syncStatusMap } from "./api/status_track";
import tutorAvailRouter from "./api/tutoravailability";
import hookRouter from "./integration/hook";
import "./integration/tc models/contractor/contractor";
import "./integration/tc models/service/service";
import "./mail/mail";
import "./scripts";
import "./tasks/dailyTasks";
import { Req } from "./types";
import { DB_URI, Log, PROD, RUN_SCRIPTS, TEST } from "./util";

const main = async () => {
    try {
        await mongoose.connect(DB_URI).then(() => {
            Log.debug(`Connected to ${(PROD || RUN_SCRIPTS ? process.env.DB_NAME : process.env.DB_DEV_NAME)}`);
        }).catch(Log.error);

        const app = express();
        app.use(cors());
        app.use(json());
        // app.use(json({
        //     verify: (req: Req, _, buf) => {
        //         req.rawBody = buf; // Keep as buffer, avoid string conversion
        //     },
        // }));

        // Middleware to log incoming requests
        app.use((req, res, next) => {
            Log.info(`[${req.method}] ${req.url}`);
            next();
        });

        app.use("/pub", express.static("public"));
        app.use("/app/*", express.static("public/dist"));
        app.use("/api", apiRouter);
        app.use("/tutoravailability", tutorAvailRouter);
        app.get("/app", (_req, res) => {
            res.sendFile(path.join(__dirname, "../public/dist/index.html"));
        });

        Log.debug("Starting status map synchronization...");
        await syncStatusMap();
        Log.debug("Status map synchronization complete.");

        // Apply express.raw() ONLY to the webhook route
        // app.use("/hook", hookRouter);
        app.use("/hook", express.raw({ type: "application/json" }), hookRouter);

        // NOT FOUND MAKE SURE AT BOTTOM
        app.use((_req, res) => {
            return res.redirect("/app");
        });
        app.listen(process.env.PORT ?? 80, () => {
            Log.debug("Ready to go");
        });
    } catch (err) {
        Log.error(`Error starting server: ${err}`);
    }
};

if(!TEST)
    main();

