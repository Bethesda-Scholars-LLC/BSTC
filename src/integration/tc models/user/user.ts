import { capitalize } from "../../../util";
import { ClientObject } from "../client/types";
import { ContractorObject } from "../contractor/types";

export const getUserFirstName = (user: ContractorObject | ClientObject) => capitalize(user.first_name ?? user.last_name).trim();

export const getUserFullName = (user: ContractorObject | ClientObject) => `${getUserFirstName(user)} ${user.first_name ? capitalize(user.last_name) : ""}`.trim();

export const cleanPhoneNumber = (inPhone: string) => {
    let phone = inPhone.replace(/\D/g, "");
    phone = phone.substring(phone.length-10);

    return `${phone.substring(0, 3)}-${phone.substring(3, 6)}-${phone.substring(6)}`;
};
