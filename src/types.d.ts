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

export type APIUser = {
    first_name: string
    last_name: string
    email: string
    mobile: string
    phone: string
    street: string
    state: string
    town: string
    country: number
    postcode: string
    latitude: number
    longitude: number
    date_created: string
    timezone: string
};

