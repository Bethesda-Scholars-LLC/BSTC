
import axios from "axios";
import { ManyResponse, TCEvent } from "../../../types";
import { Log, apiHeaders, capitalize, apiUrl, getAttrByMachineName, randomChoice } from "../../../util";
import { ContractorObject, UpdateContractorPayload } from "./types";
import { addTCListener } from "../../hook";
import AwaitingClient, { popTutorFromCA } from "../../../models/clientAwaiting";
import { transporter } from "../../../mail/mail";
import clientMatchedMail from "../../../mail/clientMatched";
import { getClientById, getMinimumClientUpdate, updateClient } from "../client/client";
import { getServiceById } from "../service/service";
import { DumbUser } from "../user/types";
import { PipelineStage } from "../service/types";

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
        await axios(apiUrl("/contractors/"), {
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

export const updateContractorDetails = async (contractor: ContractorObject) => {
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

    await updateContractor(defaultTutor);
};

addTCListener("EDITED_AVAILABILITY", async (event: TCEvent<any, ContractorObject>) => {
    const contractor = event.subject;

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

});

addTCListener("EDITED_A_CONTRACTOR", async (event: TCEvent<any, ContractorObject>) => {
    await updateContractorDetails(event.subject);
});

addTCListener("CHANGED_CONTRACTOR_STATUS", async (event: TCEvent<any, ContractorObject>) => {
    const contractor = event.subject;

    if (contractor.status === "approved") {
        await setLookingForJob(contractor, true);
        await updateContractorDetails(contractor);
    }

    return contractor;
});