import express from "express";
import { Req, Res, TCEvent, TCEventListener } from "../types";
import { Log } from "../util";
const hookRouter = express.Router();


const listeners: {
    [key: string]: TCEventListener
} = {};

export const addTCListener = (eventName: string, listener: TCEventListener) => {
    listeners[eventName] = listener;
};

hookRouter.all("*", (req: Req, res: Res) => {
    if(req.body?.events){
        Log.debug(req.body);
        const events: TCEvent[] = req.body.events;
        for(let i = 0; i < events.length; i++){
            Log.debug(events[i].action);
            const cb = listeners[events[i].action];
            if(!cb)
                continue;
            cb(events[i]);
        }
    }
    res.status(200).send();
});

export default hookRouter;