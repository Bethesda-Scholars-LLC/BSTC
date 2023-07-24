import cors from "cors";
import express, { json } from "express";
import "./integration/contractor";
import hookRouter from "./integration/hook";
import "./integration/service";
const app = express();
app.use(cors());
app.use(json());

app.use("/hook", hookRouter);

app.listen(80);
