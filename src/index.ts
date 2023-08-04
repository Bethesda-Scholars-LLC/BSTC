import cors from "cors";
import express, { json } from "express";
import "./integration/contractor";
import hookRouter from "./integration/hook";
import "./integration/service";
import "./mail/mail";
import "./scripts";
import { DB_URI, Log, PROD } from "./util";
import { Req } from "./types";
import mongoose from "mongoose";

mongoose.connect(DB_URI).then(() => { // eslint-disable-line
    Log.debug(`Connected to ${(PROD ? process.env.DB_NAME : process.env.DB_TEST_NAME)}`);
}).catch(Log.error);

const app = express();
app.use(cors());
app.use(json({
    verify: (req: Req, _, buf) => {
        req.rawBody = buf.toString();
    },
}));

app.use("/hook", hookRouter);

app.listen(80, () => {
    Log.debug("Ready to go");
});
