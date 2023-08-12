import { DumbJob } from "../service/types";
import { DumbUser } from "../user/types";

export type AdHocChargeObject = {
    id: number
    agent: {
        id: number
        first_name: string
        last_name: string
        email: string
        url: string
    }
    appointment: {
        id: number
        start: string
        finish: string
        topic: string
        status: number
        service: DumbJob
        url: string
    }
    category: {
        id: number
        name: string
        branch_tax_setup: string
        charge_via_branch: boolean
        contractor_tax_setup: string
        contractor_useable: boolean
        default_charge_ammount: number
        default_description: string
        default_pay_ammount: number
        dft_net_gross: string
    }
    category_id: number
    category_name: string
    charge_client_forex: string
    client_const: string
    client: DumbUser
    contractor: DumbUser
    creator: Omit<DumbUser, "url">
    currency: string
    currency_conversion: string
    date_occurred: string
    invoices: {
        id: number
        display_id: string
        date_sent: string
        gross: string
        net: number
        tax: string
        client: DumbUser
        status: string
        url: string
    }[]
    payment_orders: {
        id: number
        display_id: string
        gross: string
        net: number
        tax: string
        payee: DumbUser
        status: string
    }[]
    net_gross: string
    pay_contractor: string
    service: DumbJob
}

export type CreateAdHocChargePayload = {
    description: string
    date_occurred: string
    category: ChargeCat
} & ({
    contractor: number,
    pay_contractor: number
} | {
    client: number
    charge_client: number
});

