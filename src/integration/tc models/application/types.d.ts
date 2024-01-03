import { DumbJob } from "../service/types";
import { DumbUser } from "../user/types";

export type ApplicationObject = {
    description: string,
    contractor: DumbUser,
    created: string,
    proposed_rate?: string,
    service: DumbJob,
    status: string
};
