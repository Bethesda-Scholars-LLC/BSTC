import express from "express";
import { Req, Res } from "./types";
const app = express();

app.get("/", (_req: Req, res: Res) => {
    res.send("My API is working");
});

app.listen(80);
