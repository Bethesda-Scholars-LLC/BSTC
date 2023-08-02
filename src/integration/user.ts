import { APIUser } from "./userTypes";

export const getUserFirstName = (user: APIUser) => user.first_name ?? user.last_name;

