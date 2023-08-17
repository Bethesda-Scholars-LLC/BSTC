import axios from "axios";
import { ManyResponse, TCEvent } from "../../../types";
import { Log, apiHeaders, apiUrl, randomChoice } from "../../../util";
import { ClientObject, UpdateClientPayload } from "./types";
import { addTCListener } from "../../hook";
import { DumbUser } from "../user/types";
import { Labels, PipelineStage, getServiceById } from "../service/service";
import { LessonObject } from "../lesson/types";
import { JobObject } from "../service/types";
import { transporter } from "../../../mail/mail";
import { wrongTutorMail } from "../../../mail/wrongTutor";
import { getContractorById } from "../contractor/contractor";

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

export const moveToMatchedAndBooked = async (lesson: LessonObject, job: JobObject) => {
    // client must be in matched not booked and the job must not have first lesson complete
    // deleted matched not booked check, only checks for prospect now
    const client = await getClientById(lesson.rcras[0].paying_client);
    if (!client || client.status !== "prospect" || client.pipeline_stage.id === PipelineStage.MatchedAndBooked)
        return;

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
    const job = await getServiceById(lesson.service.id);
    
    // when booking with random tutor, its possible that there is no job created yet, look into that
    if (!job)
        return;
    
    // if booked with wrong tutor notify us and return
    if (job.description.toLowerCase().includes("job created while booking a lesson through tutorcruncher")) {
        for (let i = 0; i < job.labels.length; i++) {
            if (job.labels[i] === Labels.firstLessonComplete) {
                return;
            }
        }
        const client = await getClientById(job.rcrs[0].paying_client);
        const contractor = await getContractorById(job.conjobs[0].contractor);
        transporter.sendMail(wrongTutorMail(job, client, contractor), (err) => {
            if(err)
                Log.error(err);
        });
        return;
    }

    if (lesson.rcras.length > 0) {
        moveToMatchedAndBooked(lesson, job);
    }
});
