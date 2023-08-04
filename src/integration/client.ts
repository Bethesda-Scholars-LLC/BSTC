import axios from "axios";
import { ManyResponse, TCEvent } from "../types";
import { Log, apiHeaders, apiUrl, randomChoice } from "../util";
import { ClientObject, UpdateClientPayload } from "./clientTypes";
import { addTCListener } from "./hook";
import { ContractorObject } from "./contractorTypes";
import { DumbUser } from "./userTypes";

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

export const getRandomClient = async (): Promise<ClientObject | null> => {
    try {
        const clients = (await axios(apiUrl("/clients"), {headers: apiHeaders})).data as ManyResponse<DumbUser>;

        if(clients.count === 0)
            return null;

        return (await getClientById(randomChoice(clients.results).id));
    } catch(e) {
        Log.error(e);
    }
    return null;
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
