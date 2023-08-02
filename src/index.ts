import cors from "cors";
import express, { json } from "express";
import "./integration/contractor";
import hookRouter from "./integration/hook";
import "./integration/service";
import "./mail/mail";
import "./scripts";
import { Log } from "./util";

const app = express();
app.use(cors());
app.use(json({
    verify: (req: any, _ , buf) => {
        req.rawBody = buf.toString();
    },
}));

app.use("/hook", hookRouter);

// editAllContractors();

app.listen(80, () => {
    Log.debug("Ready to go");
});
