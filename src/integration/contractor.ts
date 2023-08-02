import axios from "axios";
import { TCEvent } from "../types";
import { apiHeaders, apiUrl, capitalize, getAttrByMachineName } from "../util";
import { ContractorObject, UpdateContractorPayload } from "./contractorTypes";
import { addTCListener } from "./hook";

export const getContractorById = async (id: number): Promise<ContractorObject | null> => {
    try {
        return (await axios(apiUrl(`/contractors/${id}`), {
            headers: apiHeaders
        })).data as ContractorObject;
    } catch(e) {
        console.log(e);
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
        console.log(e);
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
    const defaultTutor = getDefaultContractorUpdate(contractor);

    defaultTutor.extra_attrs = { looking_for_job: value };

    await updateContractor(defaultTutor);
};

export const setContractorDetails = async (contractor: ContractorObject) => {
    const defaultTutor = getDefaultContractorUpdate(contractor);
    const phoneNumber = getAttrByMachineName("phone_number", contractor.extra_attrs);
    const address = getAttrByMachineName("home_street_address", contractor.extra_attrs);
    const city = getAttrByMachineName("city", contractor.extra_attrs);
    const zipCode = getAttrByMachineName("zipcode", contractor.extra_attrs);
    const school = getAttrByMachineName("school_1", contractor.extra_attrs);

    // check with colin
    if (phoneNumber)
        defaultTutor.user.mobile = phoneNumber.value;
    if (address)
        defaultTutor.user.street = address;
    if (city)
        defaultTutor.user.town = city;
    if (zipCode)
        defaultTutor.user.postcode = zipCode;
    if (school) {
        defaultTutor.extra_attrs = { school_1: school.value.split(" ").map(capitalize).join(" ")};
    }
    await updateContractor(defaultTutor);
};

addTCListener("CHANGED_CONTRACTOR_STATUS", async (event: TCEvent<any, ContractorObject>) => {
    const contractor = event.subject;

    if (contractor.status === "approved") {
        await setLookingForJob(contractor, true);
        await setContractorDetails(contractor);
    }

    return contractor;
});