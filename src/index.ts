import cors from "cors";
import express, { json } from "express";
import hookRouter from "./hook";
const app = express();
app.use(cors());
app.use(json());


app.use("/hook", hookRouter);

app.listen(80);
