import { Request, Response } from "express";

/**
 * @type Alias for Express.Request
 */
export type Req = Request & {
    rawBody?: Buffer
};

/**
 * @type Alias for Express.Response
 */
export type Res = Response;

/**
 * @type TutorCruncher event
 */
export type TCEvent<SubjectType = any> = {
    action: string,
    verb: string,
    timestamp: string,
    branch: number,
    actor: {
        name: string,
        id: number,
        user_id: number,
        url: string
    },
    subject: SubjectType,
};

/**
 * @type Function that takes TCEvent, and does whatever with it
 */
export type TCEventListener<ST=any> = (event: TCEvent<ST>) => any;

export type ExtraAttr = {
    id: number
    type: string
    value: any
    machine_name: string
    name: string
}

export type ManyResponse<T> = {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}
