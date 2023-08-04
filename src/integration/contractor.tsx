import axios from "axios";
import { ManyResponse, TCEvent } from "../types";
import { Log, apiHeaders, capitalize, apiUrl, getAttrByMachineName, randomChoice } from "../util";
import { ContractorObject, UpdateContractorPayload } from "./contractorTypes";
import { addTCListener } from "./hook";
import { DumbUser } from "./userTypes";
import AwaitingClient, { popTutorFromCA } from "../models/clientAwaiting";
import ReactDOMServer from "react-dom/server";
import { ClientMatched } from "../mail/clientMatched";
import React from "react";
import { transporter } from "../mail/mail";

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

export const getRandomContractor = async (): Promise<ContractorObject | null> => {
    try {
        const contractors = (await axios(apiUrl("/contractors/"), {headers: apiHeaders})).data as ManyResponse<DumbUser>;

        if(contractors.count === 0)
            return null;

        return await getContractorById(randomChoice(contractors.results).id);
    } catch(e) {
        Log.error(e);
    }
    return null;
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

const getDefaultContractorUpdate = (tutor: ContractorObject): UpdateContractorPayload => {
    return {
        user: {
            email: tutor.user.email,
            last_name: tutor.user.last_name
        },
    };
};

export const setLookingForJob = async (contractor: ContractorObject, value: boolean) => {
    if(getAttrByMachineName("looking_for_job", contractor.extra_attrs)?.value.toLowerCase() === (value ? "true" : "false"))
        return;

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

            /*
                transporter.sendMail({
                    from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_ADDRESS}>`, // eslint-disable-line
                    to: "colinhoscheit@gmail.com",
                    cc: "services@bethesdascholars.com",
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    bcc: process.env.EMAIL_ADDRESS!,
                    subject: "Lesson with joe",
                    html: ReactDOMServer.renderToString(<ClientMatched/>)
                }, (err) => {
                    if(err)
                        Log.error(err);
                });
            */

            await AwaitingClient.findByIdAndDelete(awaitingClient._id);
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