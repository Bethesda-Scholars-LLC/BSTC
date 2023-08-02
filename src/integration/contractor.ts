import axios from "axios";
import { TCEvent } from "../types";
import { Log, apiHeaders, apiUrl, getAttrByMachineName } from "../util";
import { ContractorObject, UpdateContractorPayload } from "./contractorTypes";
import { addTCListener } from "./hook";

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

export const setContractorPhone = async (contractor: ContractorObject) => {
    const defaultTutor = getDefaultContractorUpdate(contractor);
    const phoneNumber = getAttrByMachineName("phone_number", contractor.extra_attrs);

    if (!phoneNumber)
        return;

    defaultTutor.user.mobile = phoneNumber.value;
    await updateContractor(defaultTutor);
};

addTCListener("CHANGED_CONTRACTOR_STATUS", async (event: TCEvent<any, ContractorObject>) => {
    const contractor = event.subject;

    if (contractor.status === "approved") {
        await setLookingForJob(contractor, true);
        await setContractorPhone(contractor);
    }

    return contractor;
});