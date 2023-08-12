import axios from "axios";
import { Log, apiHeaders, apiUrl } from "../../../util";
import { CreateAdHocChargePayload } from "./types";

export const enum ChargeCat {
    Referral=78484,
    Screening=77816,
    Expense=62144
}

export const createAdHocCharge = async (payload: CreateAdHocChargePayload): Promise<void> => {
    try {
        return (await axios(apiUrl("/adhoccharges/"), {
            method: "POST",
            headers: apiHeaders,
            data: payload
        })).data;
    } catch (e) {
        Log.error(e);
        return;
    }
};
