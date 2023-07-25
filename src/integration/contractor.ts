import axios from "axios";
import { TCEvent } from "../types";
import { apiHeaders, apiUrl } from "../util";
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

export const setLookingForJob = (contractor: ContractorObject | null, value: boolean) => {
    if (!contractor) {
        console.log("null contractor");
        return;
    }
    const defaultTutor = getDefaultContractorUpdate(contractor);
    defaultTutor.extra_attrs = { "looking_for_job": value };
    updateContractor(defaultTutor);
    return;
};

addTCListener("CHANGED_CONTRACTOR_STATUS", (event: TCEvent<any, ContractorObject>) => {
    const contractor = event.subject;
    if (contractor.status === "approved") {
        setLookingForJob(contractor, true);
    }
    return contractor;
});