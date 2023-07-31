import cors from "cors";
import express, { json } from "express";
import "./integration/contractor";
import hookRouter from "./integration/hook";
import "./integration/service";
import "./mail/mail";
import "./scripts";

const app = express();
app.use(cors());
app.use(json());

app.use("/hook", hookRouter);

// editAllContractors();

app.listen(80, () => {
    console.log("Ready to go");
});
