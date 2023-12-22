import { Duration } from "ts-duration";
import ApiFetcher from "../../../api/fetch";
import { GeoResponse, geocode } from "../../../geo";
import { awaitingAvailMail } from "../../../mail/awaitingAvail";
import { queueFirstLessonComplete } from "../../../mail/firstLesson";
import { goneColdMail } from "../../../mail/goneCold";
import { EmailTypes, transporter } from "../../../mail/mail";
import { queueEmail } from "../../../mail/queueMail";
import tutorMatchedMail from "../../../mail/tutorMatched";
import AwaitingClient from "../../../models/clientAwaiting";
import NotCold from "../../../models/notCold";
import ScheduleMail from "../../../models/scheduledEmail";
import { ManyResponse, TCEvent } from "../../../types";
import { Log, PROD, capitalize, getAttrByMachineName, randomChoice } from "../../../util";
import { addTCListener } from "../../hook";
import { ClientManager, getClientById, getMinimumClientUpdate, updateClient } from "../client/client";
import { ClientObject } from "../client/types";
import { getContractorById, setLookingForJob } from "../contractor/contractor";
import { LessonObject } from "../lesson/types";
import { getUserFullName } from "../user/user";
import { DumbJob, JobObject, UpdateServicePayload } from "./types";

const blairSchools = ["argyle", "eastern", "loiederman", "newport mill", "odessa shannon", "parkland", "silver spring international", "takoma park", "blair"];
const churchillSchools = ["churchill", "cabin john", "hoover", "bells mill", "seven locks", "stone mill", "cold spring", "potomac", "beverly farms", "wayside"];
const _wjSchools = ["north bethesda", "tilden"];
const day = Duration.hour(24);

export const enum PipelineStage {
    NewClient = 35326,
    MatchedNotBooked = 47188,
    AvailabilityNotBooked = 37478,
    MatchedAndBooked = 35328,
    FeedbackRequested = 47039
}

export const enum SessionLocation {
    InPerson = 107916,
    Online = 106892
}

export const enum Labels {
    firstLessonComplete = 169932
}

export const updateServiceById = async (id: number, data: UpdateServicePayload) => {
    try {
        await ApiFetcher.sendRequest(`/services/${id}/`, {
            method: "PUT",
            data: data
        });
    } catch (e) {
        Log.error(e);
    }
};

export const getServiceById = async (id: number): Promise<JobObject | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/services/${id}/`))?.data as JobObject;
    } catch (e) {
        Log.error(e);
    }
    return null;
};

export const getManyServices = async (page?: number): Promise<ManyResponse<DumbJob> | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/services?page=${Math.max(page ?? 1, 1)}`))?.data as ManyResponse<DumbJob>;
    } catch (e) {
        return null;
    }
};

export const getRandomService = async (): Promise<JobObject | null> => {
    try {
        const services = await getManyServices();

        if (!services || services.count === 0)
            return null;

        return await getServiceById(randomChoice(services.results).id);
    } catch (e) {
        Log.debug(e);
    }
    return null;
};

export const getMinimumJobUpdate = (job: JobObject | DumbJob): UpdateServicePayload => {
    return {
        name: job.name,
        dft_charge_rate: job.dft_charge_rate as any,
        dft_contractor_rate: job.dft_contractor_rate as any,
    };
};

const fixJobName = (job: JobObject): JobObject | null => {
    // if name has only one word in it, return and exit
    if (job.name.split("from")[1].trim().split(" ").length === 1)
        return null;

    const name = job.name.split("from")[1]
        .trim()
        .split(" ")
        .filter((_v: string, i: number, arr: string[]) => {
            return i === 0 || i === arr.length - 1;
        }).map((v: string, i: number) => {
            if (i === 0)
                return v;
            // last initial
            return v.charAt(0).toUpperCase() + ".";
        }).join(" ");

    job.name = job.name.split("from")[0] + "from " + name;
    return job;
};

const setDftLocation = (job: JobObject): UpdateServicePayload => {
    const jobLocation = job.description.toLowerCase()
        .split("lesson location:**\n")[1]
        .split("\n**")[0]
        .trim();

    const oldJob = getMinimumJobUpdate(job);

    // if it's set to in person, default location is in person, otherwise it's online
    oldJob.dft_location = jobLocation.includes("in-person") ? SessionLocation.InPerson : SessionLocation.Online;

    return oldJob;
};

/**
 * @param {ClientObject} client client who's child is getting tutored
 * @param {JobObject} job job object
 * @param {boolean} milesFound if client is in connecticut
 * @returns {undefined}
 * TODO: make miles found distance from maryland
 */
const setJobRate = async (client: ClientObject, job: JobObject, milesFound: boolean) => {
    const studentGrade = getAttrByMachineName("student_grade", client.extra_attrs);
    if(!studentGrade)
        return;
    let chargeRate = 40;

    if(!milesFound && studentGrade.value !== "1st-5th grade")
        return;

    if(milesFound){
        chargeRate = 65;
        if (studentGrade.value === "1st-5th grade")
            chargeRate = 55;
    }

    const jobUpdate = getMinimumJobUpdate(job);
    jobUpdate.dft_charge_rate = chargeRate;
    await updateServiceById(job.id, jobUpdate);
};

/**
 * @description update job name to only include first name and last initial
 */
addTCListener("REQUESTED_A_SERVICE", async (event: TCEvent<any, JobObject>) => {
    let job = event.subject;
    //    keep current job object unless fixJobName returns a new one
    job = fixJobName(job) ?? job;
    await updateServiceById(job.id, setDftLocation(job));

    if (job.rcrs.length > 0) {
        const client = await getClientById(job.rcrs[0].paying_client);
        if (!client)
            return;

        const school = getAttrByMachineName("student_school", client.extra_attrs);
        if (!school)
            return;

        // set school
        const updatePayload = getMinimumClientUpdate(client);
        updatePayload.status = "prospect";
        updatePayload.pipeline_stage = PipelineStage.NewClient;
        updatePayload.extra_attrs = { student_school: school.value.split(" ").map(capitalize).join(" ") };

        const schoolName = updatePayload.extra_attrs.student_school.toLowerCase();
        const clientAddress = getAttrByMachineName("home_address", client.extra_attrs);
        const addressResponses: GeoResponse[] = await geocode(clientAddress?.value);
        const milesFound = addressResponses[0]?.display_name?.toLowerCase().includes("connecticut");

        // set sophie hansen (blair), pavani (churchill), or mike (other) as client manager
        if (blairSchools.some(school => schoolName.includes(school))) {
            updatePayload.associated_admin = ClientManager.Sophie;
        } else if (churchillSchools.some(school => schoolName.includes(school))) {
            updatePayload.associated_admin = ClientManager.Pavani;
        } else if (milesFound) {
            updatePayload.associated_admin = ClientManager.Miles;
        } else {
            updatePayload.associated_admin = ClientManager.Mike;
        }
        
        await setJobRate(client, job, milesFound);
        await updateClient(updatePayload);
    }
});

addTCListener("REMOVED_CONTRACTOR_FROM_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const TCJob = event.subject;
    const realContractors = TCJob.conjobs.map(v => v.contractor);

    const DBJob = await AwaitingClient.findOne({ job_id: TCJob.id });
    if (!DBJob)
        return;

    // keep only if tutor_id is in realContractors array
    DBJob.tutor_ids = DBJob.tutor_ids.filter(v => realContractors.includes(v));
    Log.debug("removing tutor");

    if (DBJob.tutor_ids.length === 0) {
        await AwaitingClient.findByIdAndDelete(DBJob._id);
        return;
    }

    DBJob.save();

});

export const addedContractorToService = async (job: JobObject) => {
    if (job.rcrs.length > 0) {
        const client = await getClientById(job.rcrs[0].paying_client);

        for (let i = 0; i < job.conjobs.length; i++) {
            const contractor = await getContractorById(job.conjobs[i].contractor);

            if (!contractor)
                return Log.debug(`contractor is null \n ${job.conjobs[i]}`);

            await setLookingForJob(contractor, false);

            transporter.sendMail(tutorMatchedMail(contractor, client, job), (err) => {
                if (err)
                    Log.error(err);
            });

            try {
                if (client) {
                    const hasBeenAdded = (await AwaitingClient.findOne({
                        tutor_ids: contractor.id,
                        client_id: client.id,
                        job_id: job.id
                    }));
                    // if current tutor has not been added
                    if (hasBeenAdded === null) {
                        const clientJobRelation = (await AwaitingClient.findOne({
                            client_id: client.id,
                            job_id: job.id
                        }));
                        // if a client job relation has not already been made, create it
                        if (clientJobRelation === null) {
                            await new AwaitingClient({
                                client_id: client.id,
                                client_name: getUserFullName(client.user),
                                job_id: job.id,
                                tutor_ids: [contractor.id],
                                tutor_names: [getUserFullName(contractor.user)]
                            }).save();
                            // otherwise update current one
                        } else {
                            clientJobRelation.tutor_ids.push(contractor.id);
                            await clientJobRelation.save();
                        }
                        // now add to schedule mail that sends to us in 1 day if availability not set
                        const inDB = await ScheduleMail.findOne(
                            {
                                job_id: job.id,
                                client_id: client.id,
                                contractor_id: contractor.id,
                                email_type: EmailTypes.AwaitingAvail
                            }
                        );
                        if (!inDB) {
                            queueEmail(PROD ? day : Duration.second(10), awaitingAvailMail(contractor, client, job));
                        }
                    }
                }
            } catch (e) {
                Log.error(e);
            }
        }

        if (client && client.status === "prospect" && client.pipeline_stage.id === PipelineStage.NewClient) {
            await updateClient({
                ...getMinimumClientUpdate(client),
                pipeline_stage: PipelineStage.AvailabilityNotBooked
            });
        }
    }
    updateServiceById(job.id, {
        ...getMinimumJobUpdate(job),
        status: "in-progress",
    });
};
/**
 * @description update status to in progress when contract added
 */
addTCListener("ADDED_CONTRACTOR_TO_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const job = event.subject;
    addedContractorToService(job);
});

export const onLessonComplete = async (job: JobObject, client_id: number) => {
    const client = await getClientById(client_id);
    if (!client)
        return;

    // matched and booked stage
    if (client.status === "prospect" && client.pipeline_stage.id === PipelineStage.MatchedAndBooked) {
        for (let i = 0; i < job.labels.length; i++) {
            // first lesson is complete
            if (job.labels[i].id === Labels.firstLessonComplete) {
                await queueFirstLessonComplete(job);
                const updatePayload = getMinimumClientUpdate(client);
                updatePayload.pipeline_stage = PipelineStage.FeedbackRequested;
                await updateClient(updatePayload);
                return;
            }
        }
    }
};

addTCListener("ADDED_A_LABEL_TO_A_SERVICE", async (event: TCEvent<any, JobObject>) => {
    const job = event.subject;
    if (job.rcrs.length > 0) {
        await onLessonComplete(job, job.rcrs[0].paying_client);
    }
});

addTCListener("MARKED_AN_APPOINTMENT_AS_COMPLETE", async (event: TCEvent<any, LessonObject>) => {
    const lesson = event.subject;
    if (lesson.rcras.length > 0) {
        const job = await getServiceById(lesson.service.id);

        if (!job || job.rcrs.length === 0)
            return;

        await onLessonComplete(job, job.rcrs[0].paying_client);
    }
});

addTCListener("APPLIED_FOR_SERVICE", async (event: TCEvent<any, any>) => {
    const contractor = await getContractorById(event.actor.id);

    if (!contractor)
        return;

    setLookingForJob(contractor, true);
});

addTCListener("CHANGED_SERVICE_STATUS", async (event: TCEvent<any, any>) => {
    const job = event.subject;
    const client = await getClientById(job.rcrs[0].paying_client);
    if (!client)
        return;

    // add other checks here, maybe time frame near winter break cancel this
    if (job.status === "gone-cold" && client.status === "live") {
        const contractor = await getContractorById(job.conjobs[0].contractor);
        if (!contractor)
            return;
        
        const notCold = await NotCold.findOne({
            job_id: job.id,
            client_id: client.id,
            tutor_id: contractor.id
        });
        if (notCold) {

            // COMMENT AFTER THANKSGIVING AND CHRISTMAS
            /*
            transporter.sendMail(goneColdMail(job, client, contractor), (err) => {
                if (err)
                    Log.error(err);
            });*/
            // await NotCold.findByIdAndDelete(notCold.id);
            
            
            updateServiceById(job.id, {         // change status back to in progress
                ...getMinimumJobUpdate(job),
                status: "in-progress",
            });
        }
    }
});
