
import { Duration } from "ts-duration";
import { SyncContractor } from "../../../algo/contractorSync";
import ApiFetcher from "../../../api/fetch";
import { awaitingBookingMail } from "../../../mail/awaitingBooking";
import clientMatchedMail from "../../../mail/clientMatched";
import { contractorIncompleteMail } from "../../../mail/contractorIncomplete";
import { EmailTypes, transporterPascal } from "../../../mail/mail";
import { queueEmail } from "../../../mail/queueMail";
import { tutorReferralMail } from "../../../mail/tutorReferral";
import AwaitingClient, { popTutorFromCA } from "../../../models/clientAwaiting";
import ScheduleMail from "../../../models/scheduledEmail";
import { ManyResponse, TCEvent } from "../../../types";
import { Log, PROD, capitalize, getAttrByMachineName, randomChoice } from "../../../util";
import { addTCListener } from "../../hook";
import { ChargeCat, createAdHocCharge } from "../ad hoc/adHoc";
import { ApplicationObject } from "../application/types";
import { ClientManager, getClientById, getMinimumClientUpdate, moveToMatchedAndBooked, updateClient } from "../client/client";
import { PipelineStage, addedContractorToService, getServiceById, onLessonComplete } from "../service/service";
import { DumbUser } from "../user/types";
import { getUserFullName } from "../user/user";
import { ContractorObject, UpdateContractorPayload } from "./types";

const recruiterIds = {
    evelynGoldin: 2850125
};

export const getManyContractors = async (page?: number): Promise<ManyResponse<DumbUser> | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/contractors?page=${Math.max(page ?? 1, 1)}`))?.data as ManyResponse<DumbUser>;
    } catch (e) {
        Log.error(e);
        return null;
    }
};

export const getContractorById = async (id: number): Promise<ContractorObject | null> => {
    try {
        Log.info(`retrieving contractor ${id} from API`);
        const contractor = (await ApiFetcher.sendRequest(`/contractors/${id}`))?.data as ContractorObject;
        Log.info(`successfully retrieved contractor ${contractor.id} from API`);
        return contractor;
    } catch (e) {
        Log.error(e);
        return null;
    }
};

export const updateContractor = async (data: UpdateContractorPayload) => {
    try {
        Log.info(`updating contractor ${data.user.email}`);
        const contractor = await ApiFetcher.sendRequest("/contractors/", {
            method: "POST",
            data
        });
        await SyncContractor(contractor.data.role as any);
    } catch (e) {
        Log.error(e);
    }
};

export const getRandomContractor = async (): Promise<ContractorObject | null> => {
    try {
        const services = (await ApiFetcher.sendRequest("/contractors"))?.data as ManyResponse<DumbUser>;

        if (services.count === 0)
            return null;

        return await getContractorById(randomChoice(services.results).id);
    } catch (e) {
        Log.error(e);
    }
    return null;
};

export const getMinimumContractorUpdate = (tutor: {user: { email: string, last_name: string }}): UpdateContractorPayload => {
    return {
        user: {
            email: tutor.user.email,
            last_name: tutor.user.last_name
        },
    };
};

export const setTutorBias = async (contractor: {user: { email: string, last_name: string }}, value: 0 | 1) => {
    Log.info(`setting tutor bias for tutor ${contractor.user.email}`);
    const defaultTutor = getMinimumContractorUpdate(contractor);

    defaultTutor.extra_attrs = { bias: value.toString() };

    await updateContractor(defaultTutor);
};

export const setContractFilledOut = async (contractor: ContractorObject, value: boolean) => {
    const defaultTutor = getMinimumContractorUpdate(contractor);

    defaultTutor.extra_attrs = { contract_filled_out: value };

    await updateContractor(defaultTutor);
};

export const getNewContractorDetails = (contractor: ContractorObject): UpdateContractorPayload => {
    const defaultTutor = getMinimumContractorUpdate(contractor);
    const phoneNumber = getAttrByMachineName("phone_number", contractor.extra_attrs);
    const address = getAttrByMachineName("home_street_address", contractor.extra_attrs);
    const city = getAttrByMachineName("city", contractor.extra_attrs);
    const zipCode = getAttrByMachineName("zipcode", contractor.extra_attrs);
    const school = getAttrByMachineName("school_1", contractor.extra_attrs);
    const tutorUser = contractor.user;

    defaultTutor.user = {
        ...defaultTutor.user,
        mobile: phoneNumber?.value ?? tutorUser.mobile,
        street: address?.value ?? tutorUser.street,
        town: city?.value ?? tutorUser.town,
        postcode: zipCode?.value ?? tutorUser.postcode
    };

    if (school)
        defaultTutor.extra_attrs = { school_1: school.value.split(" ").map(capitalize).join(" ") };

    return defaultTutor;
};

export const updateContractorDetails = async (contractor: ContractorObject) => {
    await updateContractor(getNewContractorDetails(contractor));
    Log.info(`sucessfully updated contractor ${contractor.id}`);
};

export const popTutorFromCAs = async (contractor: ContractorObject) => {
    Log.info(`popping contractor ${contractor.id} from client_awaiting DB`);

    const dbAwaitings = await AwaitingClient.find({
        tutor_ids: contractor.id
    }).exec();
    Log.info(`sucessfully found client from DB ${JSON.stringify(dbAwaitings)}`);

    for (let i = 0; i < dbAwaitings.length; i++) {
        const awaitingClient = popTutorFromCA(dbAwaitings[i], contractor.id);

        if (awaitingClient.tutor_ids.length === 0) {
            // send email
            const client = await getClientById(awaitingClient.client_id);
            if (!client) {
                Log.info(`no client found ${awaitingClient.client_id}`);
                return;
            }

            const job = await getServiceById(awaitingClient.job_id);
            if (!job) {
                Log.info(`no service found ${awaitingClient.job_id}`);
                return;
            }

            transporterPascal.sendMail(clientMatchedMail(contractor, client, job), (err) => {
                if (err)
                    Log.error(err);
            });
            Log.info("sucessfully sent client matched mail");

            // add to scheduled email to send in three days if client has not booked yet
            const inDBAwaitingBooking = await ScheduleMail.findOne(
                {
                    job_id: job.id,
                    client_id: client.id,
                    contractor_id: contractor.id,
                    email_type: EmailTypes.AwaitingBooking
                }
            ).exec();

            if (!inDBAwaitingBooking)
                queueEmail(PROD ? Duration.hour(3 * 24) : Duration.second(10), awaitingBookingMail(contractor, client, job));

            const inDBAwaitingAvail = await ScheduleMail.findOne(
                {
                    job_id: job.id,
                    client_id: client.id,
                    contractor_id: contractor.id,
                    email_type: EmailTypes.AwaitingAvail
                }
            ).exec();
            if (inDBAwaitingAvail) {
                await ScheduleMail.findByIdAndDelete(inDBAwaitingAvail._id);
                Log.info(`sucessfully deleted mail from scheduled mail DB id ${inDBAwaitingAvail._id}`);
            }

            await AwaitingClient.findByIdAndDelete(awaitingClient._id);
            Log.info(`sucessfully deleted client from client awaiting DB id ${awaitingClient._id}`);

            if (client.status === "prospect" && client.pipeline_stage.id === PipelineStage.AvailabilityNotBooked) {
                await updateClient({
                    ...getMinimumClientUpdate(client),
                    pipeline_stage: PipelineStage.MatchedNotBooked
                });
            }

            continue;
        }
        awaitingClient.save();
    }
    //
};

addTCListener("EDITED_AVAILABILITY", async (event: TCEvent<ContractorObject>) => {
    const contractor = event.subject;

    await popTutorFromCAs(contractor);
    Log.info("sucessfully executed all tasks for this webhook");
});

addTCListener("EDITED_A_CONTRACTOR", async (event: TCEvent<ContractorObject>) => {
    Log.info(`updating contractor details ${event.subject.id}`);
    await updateContractorDetails(event.subject);
    Log.info("sucessfully executed all tasks for this webhook");
});

const day = Duration.hour(24);
addTCListener("CHANGED_CONTRACTOR_STATUS", async (event: TCEvent<ContractorObject>) => {
    const contractor = event.subject;

    if (contractor.status === "approved") {
        const toUpdate = getNewContractorDetails(contractor);
        toUpdate.extra_attrs = {
            ...toUpdate.extra_attrs,
            looking_for_job: true
        };
        await updateContractor(toUpdate);
        Log.info(`sucessfully updated contractor ${contractor.id} through API`);

        queueEmail(PROD ? Duration.hour(24 * 5) : Duration.second(10), tutorReferralMail(contractor));

        const referrerId = parseInt(getAttrByMachineName("referral", contractor.extra_attrs)?.value);
        if (!referrerId || isNaN(referrerId) || Object.values(ClientManager).includes(referrerId)) {
            Log.info(`no referral id found ${referrerId}`);
            return;
        }

        if (Object.values(recruiterIds).includes(referrerId)) {
            createAdHocCharge({
                description: `Thank you for referring ${getUserFullName(contractor.user)} to Bethesda Scholars!`,
                date_occurred: new Date(Date.now()).toISOString().replace("T", " ").split(".")[0],
                category: ChargeCat.Referral,
                contractor: referrerId,
                pay_contractor: 20.0
            });
        } else {
            createAdHocCharge({
                description: `Thank you for referring ${getUserFullName(contractor.user)} to Bethesda Scholars!`,
                date_occurred: new Date(Date.now()).toISOString().replace("T", " ").split(".")[0],
                category: ChargeCat.Referral,
                contractor: referrerId,
                pay_contractor: 15.0
            });
        }
    }
    Log.info("sucessfully executed all tasks for this webhook");
});

addTCListener("CREATED_AN_APPOINTMENT", async (event: TCEvent<any>) => {
    const lesson = event.subject;
    const job = await getServiceById(lesson.service.id);
    if (!job) {
        Log.info(`no job found under lesson ${lesson.service.id}`);
        return;
    }

    if (lesson.rcras.length > 0) {
        moveToMatchedAndBooked(lesson, job);
    }
    Log.info("sucessfully executed all tasks for this webhook");
});

addTCListener("CREATED_REPORT", async (event: TCEvent<any>) => {
    const report: any = event.subject;
    const job = await getServiceById(report.appointment.service.id);
    if (!job) {
        Log.info(`no job found with id ${report.appointment.service.id}`);
        return;
    }

    await onLessonComplete(job, report.client.id);
    Log.info("sucessfully executed all tasks for this webhook");
});

addTCListener("TENDER_WAS_ACCEPTED", async (event: TCEvent<ApplicationObject>) => {
    const application = event.subject;     // add application to types?
    const job = await getServiceById(application.service.id);
    if (!job) {
        Log.info(`no job found with id ${application.service.id}`);
        return;
    }

    addedContractorToService(job);
    Log.info("sucessfully executed all tasks for this webhook");
});

addTCListener("CONTRACTOR_SIGN_UP", async (event: TCEvent<ContractorObject>) => {
    const contractor = event.subject;

    // schedule email here
    queueEmail(PROD ? day : Duration.second(10), contractorIncompleteMail(contractor));
    Log.info("sucessfully queued contractor incomplete mail");
    Log.info("sucessfully executed all tasks for this webhook");
});