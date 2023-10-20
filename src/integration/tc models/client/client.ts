import axios from "axios";
import { ManyResponse, TCEvent } from "../../../types";
import { Log, apiHeaders, apiUrl, randomChoice } from "../../../util";
import { ClientObject, UpdateClientPayload } from "./types";
import { addTCListener } from "../../hook";
import { DumbUser } from "../user/types";
import { Labels, PipelineStage, getServiceById } from "../service/service";
import { LessonObject } from "../lesson/types";
import { JobObject } from "../service/types";
import { EmailTypes, transporter } from "../../../mail/mail";
import { wrongTutorMail } from "../../../mail/wrongTutor";
import { getContractorById } from "../contractor/contractor";
import ScheduleMail from "../../../models/scheduledEmail";
import NotCold from "../../../models/notCold";
import { getUserFullName } from "../user/user";
import { dormantBookedMail } from "../../../mail/dormantBooked";

export enum ClientManager {
    Mike=2182255,
    Sophie=2255450,
    Pavani=2255169,
    Miles=2255432
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
    // deleted matched not booked check, only checks for prospect now
    const client = await getClientById(lesson.rcras[0].paying_client);
    if (!client || client.status !== "prospect" || client.pipeline_stage.id === PipelineStage.FeedbackRequested)
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

    // remove matched not booked email that is supposed to send after 3 days here
    const contractor = await getContractorById(lesson.cjas[0].contractor);
    if (!contractor)
        return;

    const awaitingBookingEmail = await ScheduleMail.findOne(
        { job_id: job.id,
            client_id: client.id,
            contractor_id: contractor.id,
            email_type: EmailTypes.AwaitingBooking }
    );
    
    if (awaitingBookingEmail) {
        await ScheduleMail.findByIdAndDelete(awaitingBookingEmail._id);
    }

    // add to not cold clients DB if not already there
    const notCold = await NotCold.findOne({
        job_id: job.id,
        client_id: client.id,
        tutor_id: contractor.id
    });
    if (!notCold) {
        await new NotCold({
            client_id: client.id,
            client_name: getUserFullName(client.user),
            job_id: job.id,
            tutor_id: contractor.id,
            tutor_name: getUserFullName(contractor.user)
        }).save();
    }
};

addTCListener("BOOKED_AN_APPOINTMENT", async (event: TCEvent<any, LessonObject>) => {
    const lesson = event.subject;
    const job = await getServiceById(lesson.service.id);
    
    // when booking with random tutor, its possible that there is no job created yet, look into that
    if (!job)
        return;
    
    // check if client is in dormant
    const client = await getClientById(job.rcrs[0].paying_client);
    if (client?.status === "dormant") {
        transporter.sendMail(dormantBookedMail(job, client), (err) => {
            if(err)
                Log.error(err);
        });
        return;
    }

    // if booked with wrong tutor notify us and return
    if (job.description.toLowerCase().includes("job created while booking a lesson through tutorcruncher") &&
        job.status === "pending") {
        for (let i = 0; i < job.labels.length; i++) {
            if (job.labels[i] === Labels.firstLessonComplete) {
                Log.debug("first lesson complete");
                return;
            }
        }
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
