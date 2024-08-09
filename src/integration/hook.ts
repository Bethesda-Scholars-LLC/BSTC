import { createHmac } from "crypto";
import express from "express";
import { Req, Res, TCEvent, TCEventListener } from "../types";
import { Log } from "../util";
import "./tc models/ad hoc/adHoc";
const hookRouter = express.Router();

const listeners: {
    [key: string]: TCEventListener[]
} = {};

export const addTCListener = (eventNames: string | string[], listener: TCEventListener) => {
    if(typeof eventNames === "string")
        eventNames = [eventNames];
    
    for(let i = 0; i < eventNames.length; i++) {
        const eventName: string = eventNames[i];

        if(eventName in listeners) {
            if(listeners[eventName].includes(listener)) {
                Log.debug(`EXACT SAME LISTENER BINDING TWICE IN ${eventName}`);
                return;
            }
            listeners[eventName].push(listener);
            return;
        }
        listeners[eventName] = [listener];
    }
};

hookRouter.all("*", (req: Req, res: Res) => {
    if(req.body?.events && req.rawBody){
        const verifyHook = createHmac("sha256", process.env.API_KEY!) // eslint-disable-line
            .update(req.rawBody)
            .digest("hex");

        if(verifyHook !== req.headers["webhook-signature"]){
            Log.debug(`invalid request ${JSON.stringify(req.body, undefined, 2)}`);
            return res.status(400).json({error: `invalid request ${verifyHook} ${req.headers["webhook-signature"]}`}).send();
        }

        Log.debug(req.body);
        const events: TCEvent[] = req.body.events;
        for(let i = 0; i < events.length; i++){
            Log.debug(events[i].action);
            const cbs = listeners[events[i].action];
            if(!cbs)
                continue;
            cbs.forEach(cb => {
                (async () => {
                    Log.info(JSON.stringify({
                        eventName: events[i].action,
                        webhookSignature: req.headers["webhook-signature"],
                    }));
                    cb(events[i]);
                })().catch(err => {
                    Log.error(err);
                });
            });
        }
    }
    res.status(200).send();
});

export default hookRouter;