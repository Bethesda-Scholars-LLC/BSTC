import axios from "axios";
import { ClientObject, UpdateClientPayload } from "./clientTypes";
import { apiHeaders, apiUrl } from "./util";

export const updateClient = async (data: UpdateClientPayload) => {
    try {
        await axios(apiUrl("/clients/"), {
            method: "POST",
            headers: apiHeaders,
            data
        });
    } catch(e) {
        console.log(e);
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
        return (await axios(apiUrl(`/clients/${id}`))).data as ClientObject;
    } catch(e) {
        console.log(e);
        return null;
    }
};

