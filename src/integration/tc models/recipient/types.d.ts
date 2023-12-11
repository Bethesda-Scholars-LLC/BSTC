import { ExtraAttr } from "../../../types";
import { APIUser, DumbUser } from "../user/types";

type RecipientObject = {
    id: number,
    user: APIUser,
    default_rate?: number,
    paying_client: DumbUser,
    associated_clients: DumbUser[],
    academic_year: string | null,
    last_updated: string,
    calendar_colour: string,
    labels: {id: number, name: string, machine_name: string}[],
    extra_attrs: ExtraAttr[]
}