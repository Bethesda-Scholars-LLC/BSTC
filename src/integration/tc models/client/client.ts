import axios from "axios";
import { ManyResponse, TCEvent } from "../../../types";
import { Log, apiHeaders, apiUrl, randomChoice } from "../../../util";
import { ClientObject, UpdateClientPayload } from "./types";
import { addTCListener } from "../../hook";
import { DumbUser } from "../user/types";
import { Labels, PipelineStage, getServiceById } from "../service/service";
import { LessonObject } from "../lesson/types";

export enum ClientManager {
    Mike=2182255,
    Sophie=2255450,
    Pavani=2255169
}

export const updateClient = async (data: UpdateClientPayload) => {
    try {
        await axios(apiUrl("/clients/"), {
            method: "POST",
            headers: apiHeaders,
            data
        });
    } catch(e) {
        Log.error(e);
    }
};

export const getRandomClient = async (): Promise<ClientObject | null> => {
    try {
        const clients = (await axios(apiUrl("/clients"), {headers: apiHeaders})).data as ManyResponse<DumbUser>;

        if(clients.count === 0)
            return null;

        return (await getClientById(randomChoice(clients.results).id));
    } catch(e) {
        Log.error(e);
    }
    return null;
};


export const getMinimumClientUpdate = (client: ClientObject): UpdateClientPayload => {
    return {
        user: {
            email: client.user.email,
            last_name: client.user.last_name
        }
    };
};

export const getClientById = async (id: number): Promise<ClientObject | null> => {
    try {
        return (await axios(apiUrl(`/clients/${id}`), {
            headers: apiHeaders
        })).data as ClientObject;
    } catch(e) {
        Log.error(e);
        return null;
    }
};

export const moveToMatchedAndBooked = async (lesson: LessonObject) => {
    // client must be in matched not booked and the job must not have first lesson complete
    // deleted matched not booked check, only checks for prospect now
    const client = await getClientById(lesson.rcras[0].paying_client);
    if (!client || client.status !== "prospect" || client.pipeline_stage.id === PipelineStage.MatchedAndBooked)
        return;
    
    const job = await getServiceById(lesson.service.id);
    if (!job)
        return;

    // check job description for "Job created while booking a lesson through TutorCruncher”
    // and notify if the case

    for (let i = 0; i < job.labels.length; i++) {
        if (job.labels[i] === Labels.firstLessonComplete) {
            return;
        }
    }

    await updateClient({
        ...getMinimumClientUpdate(client),
        pipeline_stage: PipelineStage.MatchedAndBooked
    });
};

addTCListener("BOOKED_AN_APPOINTMENT", async (event: TCEvent<any, LessonObject>) => {
    const lesson = event.subject;
    if (lesson.rcras.length > 0) {
        moveToMatchedAndBooked(lesson);
    }
});
