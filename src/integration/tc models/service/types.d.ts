
export type Location = {
    id: number,
    name: string,
    description: string,
    can_conflict: boolean,
    role: number,
    latitude: string,
    longitude: string,
    address: string
}

export type JobObject = {
    id: number,
    allow_proposed_rates: boolean,
    branch: number,
    branch_tax_setup: string,
    cap: integer,
    colour: string,
    conjobs: {
        contractor: number
        contractor_permissions: string
        name: string
        pay_rate: null | number
    }[],
    contractor_tax_setup: string,
    created: string,
    description: string,
    dft_charge_type: string,
    dft_charge_rate: number,
    dft_contractor_permissions: string,
    dft_contractor_rate: number,
    dft_location?: Location,
    dft_max_srs: integer,
    extra_attrs: any,
    extra_fee_per_apt: string,
    inactivity_time: number,
    is_bookable: boolean,
    is_deleted: boolean,
    labels: any,
    latest_apt_ahc: string,
    name: string,
    last_updated: string,

    net_gross: string,
    rcrs: {
        recipient: number,
        recipient_name: string,
        paying_client: number,
        paying_client_name: string,
        charge_rate: string,
        agent: number,
        agent_name: string,
        agent_percentage: string
    }[],
    require_con_job: boolean,
    require_rcr: boolean,
    review_units: number,
    sales_codes: number,
    sr_premium: string,
    status: string,
    total_apt_units: decimal
};

export type DumbJob = {
    id: number,
    name: string,
    dft_charge_type: string,
    created: string,
    dft_charge_rate: string,
    dft_contractor_rate: string,
    last_updated: string,
    status: string,
    url: string
}

/**
 * PUT /services/{id}
 *
 * @type Fields for updating a service
 */
export type UpdateServicePayload = {
    name: string
    dft_charge_rate: number
    dft_contractor_rate: number
    dft_location?: number
    dft_charge_type?: string
    status?: string
    extra_attrs?: {[key: string]: string},
    conjobs?: any[]
    description?: string
};

