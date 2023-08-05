import { APIUser } from "./types";

export const getUserFirstName = (user: APIUser) => user.first_name ?? user.last_name;

