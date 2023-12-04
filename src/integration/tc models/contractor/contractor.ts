
import ApiFetcher from "../../../api/fetch";
import { awaitingBookingMail } from "../../../mail/awaitingBooking";
import clientMatchedMail from "../../../mail/clientMatched";
import { contractorIncompleteMail } from "../../../mail/contractorIncomplete";
import { EmailTypes, transporter } from "../../../mail/mail";
import { queueEmail } from "../../../mail/queueMail";
import { tutorReferralMail } from "../../../mail/tutorReferral";
import AwaitingClient, { popTutorFromCA } from "../../../models/clientAwaiting";
import ScheduleMail from "../../../models/scheduledEmail";
import { ManyResponse, TCEvent } from "../../../types";
import { Log, PROD, capitalize, getAttrByMachineName, randomChoice } from "../../../util";
import { addTCListener } from "../../hook";
import { ChargeCat, createAdHocCharge } from "../ad hoc/adHoc";
import { ClientManager, getClientById, getMinimumClientUpdate, moveToMatchedAndBooked, updateClient } from "../client/client";
import { PipelineStage, addedContractorToService, getServiceById, onLessonComplete } from "../service/service";
import { DumbUser } from "../user/types";
import { getUserFullName } from "../user/user";
import { ContractorObject, UpdateContractorPayload } from "./types";

export const getContractorById = async (id: number): Promise<ContractorObject | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/contractors/${id}`))?.data as ContractorObject;
    } catch (e) {
        Log.error(e);
        return null;
    }
};

const updateContractor = async (data: UpdateContractorPayload) => {
    try {
        return await ApiFetcher.sendRequest("/contractors/", {
            method: "POST",
            data
        });
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
        Log.debug(e);
    }
    return null;
};

const getDefaultContractorUpdate = (tutor: ContractorObject): UpdateContractorPayload => {
    return {
        user: {
            email: tutor.user.email,
            last_name: tutor.user.last_name
        },
    };
};

export const setLookingForJob = async (contractor: ContractorObject, value: boolean) => {
    const defaultTutor = getDefaultContractorUpdate(contractor);

    defaultTutor.extra_attrs = { looking_for_job: value };

    await updateContractor(defaultTutor);
};

export const getNewContractorDetails = (contractor: ContractorObject): UpdateContractorPayload => {
    const defaultTutor = getDefaultContractorUpdate(contractor);
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
};

export const popTutorFromCAs = async (contractor: ContractorObject) => {

    const dbAwaitings = await AwaitingClient.find({
        tutor_ids: contractor.id
    }).exec();

    for (let i = 0; i < dbAwaitings.length; i++) {
        const awaitingClient = popTutorFromCA(dbAwaitings[i], contractor.id);

        if (awaitingClient.tutor_ids.length === 0) {
            // send email
            const client = await getClientById(awaitingClient.client_id);
            if (!client)
                return;

            const job = await getServiceById(awaitingClient.job_id);
            if (!job)
                return;

            transporter.sendMail(clientMatchedMail(contractor, client, job), (err) => {
                if (err)
                    Log.error(err);
            });

            // add to scheduled email to send in three days if client has not booked yet
            const inDBAwaitingBooking = await ScheduleMail.findOne(
                {
                    job_id: job.id,
                    client_id: client.id,
                    contractor_id: contractor.id,
                    email_type: EmailTypes.AwaitingBooking
                }
            );
            if (!inDBAwaitingBooking) {
                queueEmail(PROD ? day * 3 : 10000, awaitingBookingMail(contractor, client, job));
            }

            const inDBAwaitingAvail = await ScheduleMail.findOne(
                {
                    job_id: job.id,
                    client_id: client.id,
                    contractor_id: contractor.id,
                    email_type: EmailTypes.AwaitingAvail
                }
            );
            if (inDBAwaitingAvail) {
                await ScheduleMail.findByIdAndDelete(inDBAwaitingAvail._id);
            }

            await AwaitingClient.findByIdAndDelete(awaitingClient._id);

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

addTCListener("EDITED_AVAILABILITY", async (event: TCEvent<any, ContractorObject>) => {
    const contractor = event.subject;

    await popTutorFromCAs(contractor);
});

addTCListener("EDITED_A_CONTRACTOR", async (event: TCEvent<any, ContractorObject>) => {
    await updateContractorDetails(event.subject);
});

const day = 86400000;
addTCListener("CHANGED_CONTRACTOR_STATUS", async (event: TCEvent<any, ContractorObject>) => {
    const contractor = event.subject;

    if (contractor.status === "approved") {
        const toUpdate = getNewContractorDetails(contractor);
        toUpdate.extra_attrs = {
            ...toUpdate.extra_attrs,
            looking_for_job: true
        };
        await updateContractor(toUpdate);

        queueEmail(PROD ? day * 5 : 10000, tutorReferralMail(contractor));

        const referrerId = parseInt(getAttrByMachineName("referral", contractor.extra_attrs)?.value);
        if (!referrerId || isNaN(referrerId) || Object.values(ClientManager).includes(referrerId))
            return;

        createAdHocCharge({
            description: `Thank you for referring ${getUserFullName(contractor.user)} to Bethesda Scholars!`,
            date_occurred: new Date(Date.now()).toISOString().replace("T", " ").split(".")[0],
            category: ChargeCat.Referral,
            contractor: referrerId,
            pay_contractor: 10.0
        });
    }
});

addTCListener("CREATED_AN_APPOINTMENT", async (event: TCEvent<any, any>) => {
    const lesson = event.subject;
    const job = await getServiceById(lesson.service.id);
    if (!job)
        return;

    if (lesson.rcras.length > 0) {
        moveToMatchedAndBooked(lesson, job);
    }
});

addTCListener("CREATED_REPORT", async (event: TCEvent<any, any>) => {
    const report: any = event.subject;
    const job = await getServiceById(report.appointment.service.id);
    if (!job)
        return;

    await onLessonComplete(job, report.client.id);
});

addTCListener("TENDER_WAS_ACCEPTED", async (event: TCEvent<any, any>) => {
    const application: any = event.subject;     // add application to types?
    const job = await getServiceById(application.service.id);
    if (!job)
        return;

    addedContractorToService(job);
});

addTCListener("CONTRACTOR_SIGN_UP", async (event: TCEvent<any, ContractorObject>) => {
    const contractor = event.subject;

    // schedule email here
    queueEmail(PROD ? day : 10000, contractorIncompleteMail(contractor));
});