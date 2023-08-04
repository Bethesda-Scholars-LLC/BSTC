import { Request, Response } from "express";

/**
 * @type Alias for Express.Request
 */
export type Req = Request & {
    rawBody?: string
};

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
