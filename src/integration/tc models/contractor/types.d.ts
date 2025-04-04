import { APIUser } from "../user/types";

export type ContractorObject = {
    id: number
    first_name: string
    last_name: string
    email: string
    mobile: string
    phone: string
    photo: string | null | undefined
    street: string
    state: string
    town: string
    country: number
    postcode: string
    latitude: number
    longitude: number
    date_created: string
    timezone: string
    status: string
    charge_via_branch: boolean
    default_rate: number
    qualifications: {
        id: number
        institution: string
        subject: string
        qual_level: string
        grade: string
        year: number
        governing_body: string
    }[]
    skills: skillType[],
    institutions: {
        id: number,
        name: string,
    }[]
    receive_service_notifications: boolean
    review_rating: number
    review_duration: string
    last_updated: string
    calendar_colour: string
    labels: {
        id: number
        name: string
        machine_name: string
    }[],
    extra_attrs: any[]
    work_done_details: {
        amount_owed: number
        amount_paid: number
        total_paid_hours: string | number
    }
}

export type UpdateContractorPayload = {
    email?: string,
    last_name?: string,
    mobile?: string,
    street?: string,
    postcode?: string,
    town?: string
    first_name?: string
    phone?: string
    state?: string
    country?: number
    latitude?: number
    longitude?: number
    date_created?: string
    timezone?: string
    status?: string,
    extra_attrs?: {[key: string]: any}
};

export type skillType = {
    id: number,
        contractor: {
            id: number,
            first_name: string,
            last_name: string,
            email: string,
            url: string
        },
        subject: {
            id: number,
            name: string,
            category_id: number,
            category_name: string
        },
        qual_level: {
            id: number,
            name: string,
            ranking: number
        }
};