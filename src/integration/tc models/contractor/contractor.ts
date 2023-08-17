
import axios from "axios";
import { ManyResponse, TCEvent } from "../../../types";
import { Log, apiHeaders, capitalize, apiUrl, getAttrByMachineName, randomChoice, PROD } from "../../../util";
import { ContractorObject, UpdateContractorPayload } from "./types";
import { addTCListener } from "../../hook";
import AwaitingClient, { popTutorFromCA } from "../../../models/clientAwaiting";
import { transporter } from "../../../mail/mail";
import clientMatchedMail from "../../../mail/clientMatched";
import { ClientManager, getClientById, getMinimumClientUpdate, moveToMatchedAndBooked, updateClient } from "../client/client";
import { Labels, PipelineStage, getServiceById } from "../service/service";
import { DumbUser } from "../user/types";
import { ChargeCat, createAdHocCharge } from "../ad hoc/adHoc";
import { getUserFullName } from "../user/user";
import { queueEmail } from "../../../mail/queueMail";
import { tutorReferralMail } from "../../../mail/tutorReferral";

export const getContractorById = async (id: number): Promise<ContractorObject | null> => {
    try {
        return (await axios(apiUrl(`/contractors/${id}`), {
            headers: apiHeaders
        })).data as ContractorObject;
    } catch(e) {
        Log.error(e);
        return null;
    }
};

const updateContractor = async (data: UpdateContractorPayload) => {
    try {
        return await axios(apiUrl("/contractors/"), {
            method: "POST",
            headers: apiHeaders,
            data
        });
    } catch(e) {
        Log.error(e);
    }
};

export const getRandomContractor = async (): Promise<ContractorObject | null> => {
    try{
        const services = (await axios(apiUrl("/contractors"), { headers: apiHeaders })).data as ManyResponse<DumbUser>;
        
        if(services.count === 0)
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
        defaultTutor.extra_attrs = { school_1: school.value.split(" ").map(capitalize).join(" ")};

    return defaultTutor;
};

export const updateContractorDetails = async (contractor: ContractorObject) => {
    await updateContractor(getNewContractorDetails(contractor));
};

export const popTutorFromCAs = async (contractor: ContractorObject) => {
    
    const dbAwaitings = await AwaitingClient.find({
        tutor_ids: contractor.id
    });

    for(let i = 0; i < dbAwaitings.length; i++) {
        const awaitingClient = popTutorFromCA(dbAwaitings[i], contractor.id);

        if(awaitingClient.tutor_ids.length === 0){
            // send email
            const client = await getClientById(awaitingClient.client_id);
            if(!client)
                return;

            const job = await getServiceById(awaitingClient.job_id);
            if(!job)
                return;
            
            transporter.sendMail(clientMatchedMail(contractor, client, job), (err) => {
                if(err)
                    Log.error(err);
            });

            await AwaitingClient.findByIdAndDelete(awaitingClient._id);

            // Move client down pipeline after sending email

            
            await updateClient({
                ...getMinimumClientUpdate(client),
                pipeline_stage: PipelineStage.MatchedNotBooked
            });

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
            looking_for_job : true
        };
        await updateContractor(toUpdate);

        queueEmail(Date.now() + (PROD ? day*5 : 10000), tutorReferralMail(contractor));

        const referrerId = parseInt(getAttrByMachineName("referral", contractor.extra_attrs)?.value);
        if(!referrerId || isNaN(referrerId) || Object.values(ClientManager).includes(referrerId))
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