import { Request, Response } from "express";

/**
 * @type Alias for Express.Request
 */
export type Req = Request;

/**
 * @type Alias for Express.Response
 */
export type Res = Response;

/**
 * @type TutorCruncher event
 */
export type TCEvent<ActorType=any, SubjectType = any> = {
    action: string,
    verb: string,
    timestamp: string,
    branch: number,
    actor: ActorType,
    subject: SubjectType,
};

/**
 * @type Function that takes TCEvent, and does whatever with it
 */
export type TCEventListener<AT=any, ST=any> = (event: TCEvent<AT, ST>) => any;

export type JobObject = {
    id: number,
    allow_proposed_rates: boolean,
    branch: number,
    branch_tax_setup: string,
    cap: integer,
    colour: string,
    conjobs: any,
    contractor_tax_setup: string,
    created: string,
    description: string,
    dft_charge_type: string,
    dft_charge_rate: number,
    dft_contractor_permissions: string,
    dft_contractor_rate: number,
    dft_location: {
        id: number,
        name: string,
        description: string,
        can_conflict: boolean,
        role: number,
        latitude: string,
        longitude: string,
        address: string
    },
    dft_max_srs: integer,
    extra_attrs: any,
    extra_fee_per_apt: string,
    inactivity_time: number,
    is_bookable: boolean,
    is_deleted: boolean,
    labels: any,
    latest_apt_ahc: string,
    name: string,
    net_gross: string,
    rcrs: array,
    require_con_job: boolean,
    require_rcr: boolean,
    review_units: number,
    sales_codes: number,
    sr_premium: string,
    status: string,
    total_apt_units: decimal
};

