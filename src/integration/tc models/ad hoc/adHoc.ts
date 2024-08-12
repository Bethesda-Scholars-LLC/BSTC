import ApiFetcher from "../../../api/fetch";
import { Log } from "../../../util";
import { CreateAdHocChargePayload } from "./types";

export const enum ChargeCat {
    Referral=78484,
    Screening=77816,
    Expense=62144
}

export const createAdHocCharge = async (payload: CreateAdHocChargePayload): Promise<void> => {
    try {
        Log.info(`creating adHocCharge for ${JSON.stringify(payload)}`);
        return (await ApiFetcher.sendRequest("/adhoccharges/", {
            method: "POST",
            data: payload
        }))?.data;
    } catch (e) {
        Log.error(e);
        return;
    }
};
