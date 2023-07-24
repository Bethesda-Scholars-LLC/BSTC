import { APIUser } from "./types";

export type ClientObject = {
    id: number
    user: APIUser
    status: string
    is_taxable: boolean
    notify_via_email: boolean
    charge_via_branch: boolean
    invoices_count: number
    payment_pending: string
    auto_charge: number
    associated_admin: {
        id: number
        first_name: string
        last_name: string
        email: string
    }
    associated_agent: {
        id: number
        first_name: string
        last_name: string
        email: string
        url: string
    }
    "pipeline-stage": {
        id: number
        name: string
        sort_index: number
    }
    paid_recipients: {
        id: number
        first_name: string
        last_name: string
        email: string
        url: string
    }[]
    last_updated: string
    calendar_colour: string
    labels: {
        id: number
        name: string
        machine_name: string
    }[]
    extra_attrs: any[]
    invoice_balance: string
    available_balance: string
};

export type UpdateClientPayload = {
    user: {
        email: string
        last_name: string
    }
    "pipeline-stage"?: null | id
}

