import { Duration } from "ts-duration";
import ApiFetcher from "../../../api/fetch";
import { removeStatusJob, updateStatusJob } from "../../../api/status_track";
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
import { getContractorById, getMinimumContractorUpdate, setTutorBias, updateContractor } from "../contractor/contractor";
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

export const updateServiceStatus = async (job: DumbJob | JobObject, status: "in-progress" | "available" | "finished") => {
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
        Log.info(`updating service ${id} through API`);
        await ApiFetcher.sendRequest(`/services/${id}/`, {
            method: "PUT",
            data: data
        });
        Log.info(`sucessfully updated service ${id} through API`);
    } catch (e) {
        Log.error(e);
    }
};

export const getServiceById = async (id: number): Promise<JobObject | null> => {
    try {
        Log.info(`retrieving service ${id} from API`);
        const service = (await ApiFetcher.sendRequest(`/services/${id}/`))?.data as JobObject;
        Log.info(`successfully retrieved service ${service.id} from API`);
        return service;
    } catch (e) {
        Log.error(e);
    }
    return null;
};

export const getManyServices = async (page?: number): Promise<ManyResponse<DumbJob> | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/services?page=${Math.max(page ?? 1, 1)}`))?.data as ManyResponse<DumbJob>;
    } catch (e) {
        Log.error(e);
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
        Log.error(e);
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
    Log.info(`fixing job name ${job.id}`);
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

export const setDftLocation = (job: JobObject): UpdateServicePayload => {
    Log.info(`setting default location ${job.id}`);
    let jobLocation = "";
    if (job.description.toLowerCase().includes("lesson location:**")) {
        jobLocation = job.description.toLowerCase()
            .split("lesson location:**")[1]
            .split("\n**")[0]
            .trim();
    }

    const oldJob = getMinimumJobUpdate(job);

    // if it's set to in person, default location is in person, otherwise it's online
    oldJob.dft_location = jobLocation.includes("in-person") ? SessionLocation.InPerson : SessionLocation.Online;

    return oldJob;
};

/**
 * @param {string} allSubjects all subjects listed in the job description
 * @param {string} subject subject to check if in string
 * @returns {boolean}
 * TODO: check if the given subject is listed in the list of subjects
 */
const checkSubject = (allSubjects: string, subject: string) => {
    const characters = [" ", "/", ","];
    if (subject === "sat")
        characters.push("p");
    return (allSubjects.indexOf(subject) === 0 || (allSubjects.indexOf(subject) >= 1 && characters.includes(allSubjects.charAt(allSubjects.indexOf(subject) - 1))));
};

/**
 * @param {ClientObject} client client who's child is getting tutored
 * @param {JobObject} job job object
 * @param {boolean} milesFound if client is in connecticut
 * @returns {undefined}
 * TODO: make miles found distance from maryland
 */
export const setJobRate = async (client: ClientObject, job: JobObject, outOfState: boolean) => {
    Log.info(`setting job rate for job ${job.id}`);
    const studentGrade = getAttrByMachineName("student_grade", client.extra_attrs);
    const location = getAttrByMachineName("lesson_location", client.extra_attrs);
    const subject = getAttrByMachineName("subjects", client.extra_attrs)?.value.toLowerCase();
    const apPrecalcIB = (checkSubject(subject, "ap") ||
                       checkSubject(subject, "precalc") ||
                       checkSubject(subject, "pre calc") ||
                       checkSubject(subject, "pre-calc") ||
                       checkSubject(subject, "calc") ||
                       checkSubject(subject, "prec") ||
                       checkSubject(subject, "ib"));
    const satACT = (checkSubject(subject, "sat") || checkSubject(subject, "act"));
    let chargeRate = 40;
    let payRate = 25;

    if (!studentGrade || studentGrade.value !== "1st-5th grade")
        chargeRate += 5;
    if (location && location.value === "In-person lessons at my house")
        chargeRate += 5;
    if (outOfState)
        chargeRate += 10;
    if (apPrecalcIB && !satACT) {
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
    Log.info(`checking out of state ${client.id}`);
    const clientZip = parseInt((getAttrByMachineName("zip_code", client.extra_attrs)?.value)??"");
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
        if (!school) {
            Log.info(`no school extr_attr found on client object ${client.id}`);
            return;
        }

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
    Log.info("sucessfully executed all tasks for this callback function");
});

addTCListener(["CREATED_A_SERVICE", "CHANGED_SERVICE_STATUS", "REQUESTED_A_SERVICE"], async (ev: TCEvent<JobObject>) => {
    const service = ev.subject;
    await updateStatusJob(service);
    Log.info("updated job status");
});

addTCListener("DELETED_A_SERVICE", async (ev: TCEvent<JobObject>) => {
    const service = ev.subject;
    removeStatusJob(service);
    Log.info("updated job status");
});

addTCListener("REMOVED_CONTRACTOR_FROM_SERVICE", async (event: TCEvent<JobObject>) => {
    const TCJob = event.subject;
    const realContractors = TCJob.conjobs.map(v => v.contractor);

    const DBJob = await AwaitingClient.findOne({ job_id: TCJob.id }).exec();
    if (!DBJob) {
        Log.info(`no db job found for job ${TCJob.id}`);
        return;
    }

    // keep only if tutor_id is in realContractors array
    DBJob.tutor_ids = DBJob.tutor_ids.filter(v => realContractors.includes(v));
    Log.debug("removing tutor");

    if (DBJob.tutor_ids.length === 0) {
        await AwaitingClient.findByIdAndDelete(DBJob._id);
        Log.info(`deleted awaiting client from db with _id ${DBJob._id}`);
        return;
    }

    await DBJob.save();
    Log.info("sucessfully executed all tasks for this callback function");
});

export const addedContractorToService = async (job: JobObject) => {
    Log.info(`handling added contractor to service ${job.id}`);
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
            Log.info("sucessfully sent tutor matched mail");

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

                    defaultTutor.extra_attrs = { bias: "0" };

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
                        await queueEmail(PROD ? day : Duration.second(10), awaitingAvailMail(contractor, client, job));
                        Log.info("sucessfully scheduled availability not set mail to expire in one day");
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

    await updateServiceStatus(job, "in-progress");
};
/**
 * @description update status to in progress when contract added
 */
addTCListener("ADDED_CONTRACTOR_TO_SERVICE", async (event: TCEvent<JobObject>) => {
    const job = event.subject;
    await addedContractorToService(job);
    Log.info("sucessfully executed all tasks for this callback function");
});

export const onLessonComplete = async (job: JobObject, client_id: number) => {
    const client = await getClientById(client_id);
    if (!client) {
        Log.info(`no client found with id ${client_id}`);
        return;
    }

    // matched and booked and only one lesson on the job and only one lesson on the job
    if (client.status === "prospect" && client.pipeline_stage.id === PipelineStage.MatchedAndBooked
        && job.total_apt_units <= 2) {
        for (let i = 0; i < job.labels.length; i++) {
            // first lesson is complete
            if (job.labels[i].id === Labels.firstLessonComplete) {
                Log.info("queueing first lesson complete mail");
                await queueFirstLessonComplete(job);
                const updatePayload = getMinimumClientUpdate(client);
                updatePayload.pipeline_stage = PipelineStage.FeedbackRequested;
                await updateClient(updatePayload);
                return;
            }
        }
    }
    Log.info("sucessfully executed all tasks for this callback function");
};

addTCListener("ADDED_A_LABEL_TO_A_SERVICE", async (event: TCEvent<JobObject>) => {
    const job = event.subject;
    if (job.rcrs.length > 0) {
        await onLessonComplete(job, job.rcrs[0].paying_client);
    }
    Log.info("sucessfully executed all tasks for this callback function");
});

addTCListener("MARKED_AN_APPOINTMENT_AS_COMPLETE", async (event: TCEvent<LessonObject>) => {
    const lesson = event.subject;
    if (lesson.rcras.length > 0) {
        const job = await getServiceById(lesson.service.id);

        if (!job || job.rcrs.length === 0)
            return;

        await onLessonComplete(job, job.rcrs[0].paying_client);
    }
    Log.info("sucessfully executed all tasks for this callback function");
});

addTCListener("APPLIED_FOR_SERVICE", async (event: TCEvent<any>) => {
    const contractor = await getContractorById(event.actor.id);

    if (!contractor)
        return;

    // setLookingForJob(contractor, true);
    setTutorBias(contractor, 1);
    Log.info("sucessfully executed all tasks for this callback function");
    return;
});

addTCListener("CHANGED_SERVICE_STATUS", async (event: TCEvent<JobObject>) => {
    const job = event.subject;

    if(job.rcrs.length === 0 || job.conjobs.length === 0) {
        Log.info("0 rcrs/contractors on job");
        return;
    }
    
    const client = await getClientById(job.rcrs[0].paying_client);
    if (!client)
        return;

    // add other checks here, maybe time frame near winter break cancel this
    if (job.status === "gone-cold" && client.status === "live") {

        const contractor = await getContractorById(job.conjobs[0].contractor);
        if (!contractor) {
            Log.info(`no contractor found with id ${job.conjobs[0].contractor}`);
            return;
        }
        
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
            Log.info(`sucessfully sent gone cold mail for job ${job.id}`);
            
            await updateServiceStatus(job, "in-progress");
        }
    }
    Log.info("sucessfully executed all tasks for this callback function");
});
