import { APIUser } from "../user/types";

export type ContractorObject = {
    id: number
    user: APIUser
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
    skills: {
        id: number,
        subject: string,
        qual_level: string
    }[]
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
        total_paid_hours: string
    }
}

export type UpdateContractorPayload = {
    user: {
        email: string,
        last_name: string,
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
    },
    extra_attrs?: {[key: string]: any}
};
