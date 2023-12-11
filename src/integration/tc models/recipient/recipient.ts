import ApiFetcher from "./../../../api/fetch";
import { Log } from "./../../../util";
import { RecipientObject } from "./types";

export const getRecipientById = async (id: number): Promise<RecipientObject | null> => {
    try {
        return (await ApiFetcher.sendRequest(`/recipients/${id}/`))?.data as RecipientObject;
    } catch (e) {
        Log.error(e);
    }
    return null;
};
