import axios from "axios";
import { TCEvent } from "../types";
import { Log, apiHeaders, apiUrl } from "../util";
import { ClientObject, UpdateClientPayload } from "./clientTypes";
import { addTCListener } from "./hook";

export const updateClient = async (data: UpdateClientPayload) => {
    try {
        await axios(apiUrl("/clients/"), {
            method: "POST",
            headers: apiHeaders,
            data
        });
    } catch(e) {
        Log.error(e);
    }
};

export const getMinimumClientUpdate = (client: ClientObject): UpdateClientPayload => {
    return {
        user: {
            email: client.user.email,
            last_name: client.user.last_name
        }
    };
};

export const getClientById = async (id: number): Promise<ClientObject | null> => {
    try {
        return (await axios(apiUrl(`/clients/${id}`), {
            headers: apiHeaders
        })).data as ClientObject;
    } catch(e) {
        Log.error(e);
        return null;
    }
};

addTCListener("BOOKED_AN_APPOINTMENT", (event: TCEvent<any, any>) => {
    Log.debug(event.actor);
    Log.debug(event.subject);
});
