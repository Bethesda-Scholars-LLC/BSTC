import { Duration } from "ts-duration";
import ApiFetcher from "../../../api/fetch";
import { updateStatusJob } from "../../../api/status_track";
import { getStateByZipCode } from "../../../geo";
import { awaitingAvailMail } from "../../../mail/awaitingAvail";
import { queueFirstLessonComplete } from "../../../mail/firstLesson";
import { goneColdMail } from "../../../mail/goneCold";
import { EmailTypes, transporterManager, transporterPascal } from "../../../mail/mail";
import { queueEmail } from "../../../mail/queueMail";
import tutorMatchedMail from "../../../mail/tutorMatched";
import AwaitingClient from "../../../models/clientAwaiting";
import NotCold from "../../../models/notCold";
import ScheduleMail from "../../../models/scheduledEmail";
import TutorModel from "../../../models/tutor";
import { ManyResponse, TCEvent } from "../../../types";
import { Log, PROD, capitalize, getAttrByMachineName, randomChoice } from "../../../util";
import { addTCListener } from "../../hook";
import { getClientById, getMinimumClientUpdate, updateClient } from "../client/client";
import { ClientObject } from "../client/types";
import { getContractorById, getMinimumContractorUpdate, setLookingForJob, updateContractor } from "../contractor/contractor";
import { LessonObject } from "../lesson/types";
import { getUserFullName } from "../user/user";
import { DumbJob, JobObject, UpdateServicePayload } from "./types";

const exemptClients = ["soueid.erica@gmail.com", "bego.cortina@me.com", "eakhtarzandi@nationaljournal.com",
                        "marisa.michnick@gmail.com", "sanazshojaie@hotmail.com", "roxana.grieve@gmail.com",
                        "milias1977@gmail.com", "bannisterrenee@aol.com", "jedmeline@yahoo.com",
                        "mdmeline@yahoo.com", "mmeline2@yahoo.com", "anjali.kataria@gmail.com", "anjali@mytonomy.com"];
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

export const updateServiceStatus = async (job: DumbJob | JobObject, status: "in-progress" | "available") => {
    await Promise.all([
        updateStatusJob({...job, status}),
        updateServiceById(job.id, {         // change status back to in progress
            ...getMinimumJobUpdate(job),
            status,
        })
    ]);
};

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
export const setJobRate = async (client: ClientObject, job: JobObject, outOfState: boolean) => {
    const studentGrade = getAttrByMachineName("student_grade", client.extra_attrs);
    const location = getAttrByMachineName("lesson_location", client.extra_attrs);
    const subject = getAttrByMachineName("subjects", client.extra_attrs)?.value.toLowerCase();
    const apPrecalc = ((subject.indexOf("ap") === 0 ||
                        (subject.indexOf("ap") >= 1 && subject.charAt(subject.indexOf("ap") - 1) === " ")) ||
                        subject.includes("prec") ||
                        subject.includes("pre c") ||
                        subject.includes("pre-c") ||
                        subject.includes("calc") ||
                        (subject.indexOf("ib") === 0 ||
                        (subject.indexOf("ib") >= 1 && subject.charAt(subject.indexOf("ib") - 1) === " ")));
    const satACT = (subject.includes("sat") ||
                    subject.includes("act"));
    
    let chargeRate = 40;
    let payRate = 25;

    if (!studentGrade || studentGrade.value !== "1st-5th grade")
        chargeRate += 5;
    if (location && location.value === "In-person lessons at my house")
        chargeRate += 5;
    if (outOfState)
        chargeRate += 10;
    if (apPrecalc && !satACT) {
        chargeRate += 5;
    } else if (satACT) {
        chargeRate += 15;
        payRate += 10;
    }

    if (exemptClients.includes(client.user.email)) {
        chargeRate = 45;
        payRate = 25;
    }

    const jobUpdate = getMinimumJobUpdate(job);
    jobUpdate.dft_charge_rate = chargeRate;
    jobUpdate.dft_contractor_rate = payRate;
    await updateServiceById(job.id, jobUpdate);
};

export const checkOutOfState = (client: ClientObject) => {
    const clientZip = parseInt((getAttrByMachineName("zip code", client.extra_attrs)?.value)??"");

    const state = (getStateByZipCode(clientZip)?.code??"MD").toLowerCase();
    return !(["md", "dc", "va"].includes(state));
};

/**
 * @description update job name to only include first name and last initial
 */
addTCListener("REQUESTED_A_SERVICE", async (event: TCEvent<JobObject>) => {
    let job = event.subject;
    //    keep current job object unless fixJobName returns a new one
    job = fixJobName(job) ?? job;
    await updateServiceById(job.id, setDftLocation(job));

    Log.debug("Job name fixed", job.rcrs);
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

        // const schoolName = updatePayload.extra_attrs.student_school.toLowerCase();
        const outOfState = checkOutOfState(client);
        

        // set sophie hansen (blair), pavani (churchill), or mike (other) as client manager
        /*
        if (blairSchools.some(school => schoolName.includes(school))) {
            updatePayload.associated_admin = ClientManager.Sophie;
        } else if (churchillSchools.some(school => schoolName.includes(school))) {
            updatePayload.associated_admin = ClientManager.Pavani;
        } else if (milesFound) {
            updatePayload.associated_admin = ClientManager.Miles;
        } else {
            updatePayload.associated_admin = ClientManager.Mike;
        }*/
        
        await setJobRate(client, job, outOfState);
        await updateClient(updatePayload);
    }
});

addTCListener("REMOVED_CONTRACTOR_FROM_SERVICE", async (event: TCEvent<JobObject>) => {
    const TCJob = event.subject;
    const realContractors = TCJob.conjobs.map(v => v.contractor);

    const DBJob = await AwaitingClient.findOne({ job_id: TCJob.id }).exec();
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

            transporterPascal.sendMail(tutorMatchedMail(contractor, client, job), (err) => {
                if (err)
                    Log.error(err);
            });

            try {
                if (client) {
                    const hasBeenAdded = (await AwaitingClient.findOne({
                        tutor_ids: contractor.id,
                        client_id: client.id,
                        job_id: job.id
                    }).exec());
                    // if current tutor has already been added to this job, go next
                    if (hasBeenAdded)
                        continue;
                    // if current tutor was just added to job
                    
                    await TutorModel.updateOne({cruncher_id: contractor.id}, {bias: 0}).exec();

                    const defaultTutor = getMinimumContractorUpdate(contractor);

                    defaultTutor.extra_attrs = { bias: "0", looking_for_job: false };

                    await updateContractor(defaultTutor);

                    const clientJobRelation = (await AwaitingClient.findOne({
                        client_id: client.id,
                        job_id: job.id
                    }).exec());
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
                    ).exec();
                    if (!inDB) {
                        queueEmail(PROD ? day : Duration.second(10), awaitingAvailMail(contractor, client, job));
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

    updateServiceStatus(job, "in-progress");
};
/**
 * @description update status to in progress when contract added
 */
addTCListener("ADDED_CONTRACTOR_TO_SERVICE", async (event: TCEvent<JobObject>) => {
    const job = event.subject;
    addedContractorToService(job);
});

export const onLessonComplete = async (job: JobObject, client_id: number) => {
    const client = await getClientById(client_id);
    if (!client)
        return;

    // matched and booked and only one lesson on the job and only one lesson on the job
    if (client.status === "prospect" && client.pipeline_stage.id === PipelineStage.MatchedAndBooked
        && job.total_apt_units <= 2) {
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

addTCListener("ADDED_A_LABEL_TO_A_SERVICE", async (event: TCEvent<JobObject>) => {
    const job = event.subject;
    if (job.rcrs.length > 0) {
        await onLessonComplete(job, job.rcrs[0].paying_client);
    }
});

addTCListener("MARKED_AN_APPOINTMENT_AS_COMPLETE", async (event: TCEvent<LessonObject>) => {
    const lesson = event.subject;
    if (lesson.rcras.length > 0) {
        const job = await getServiceById(lesson.service.id);

        if (!job || job.rcrs.length === 0)
            return;

        await onLessonComplete(job, job.rcrs[0].paying_client);
    }
});

addTCListener("APPLIED_FOR_SERVICE", async (event: TCEvent<any>) => {
    const contractor = await getContractorById(event.actor.id);

    if (!contractor)
        return;

    setLookingForJob(contractor, true);
});

addTCListener("CHANGED_SERVICE_STATUS", async (event: TCEvent<JobObject>) => {
    const job = event.subject;

    if(job.rcrs.length === 0) {
        Log.warn("0 rcrs on job");
        return;
    }
    
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
        }).exec();
        if (notCold) {

            // COMMENT AFTER THANKSGIVING AND CHRISTMAS
            
            transporterManager.sendMail(goneColdMail(job, client, contractor), (err) => {
                if (err)
                    Log.error(err);
            });
            // await NotCold.findByIdAndDelete(notCold.id);
            
            
            updateServiceStatus(job, "in-progress");
        }
    }
});
