import axios from "axios";
import { ContractorObject, UpdateContractorPayload } from "./contractorTypes";
import { addTCListener } from "./hook";
import { TCEvent } from "./types";
import { apiHeaders, apiUrl } from "./util";

const updateContractorById = async (id: number, data: UpdateContractorPayload)=>{
    try {
        await axios(apiUrl(`/contractors/${id}`), {
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
        }
    };
};

addTCListener("CHANGED_CONTRACTOR_STATUS", (event: TCEvent<any, ContractorObject>) => {
    const contractor = event.subject;
    console.log(contractor);
});
