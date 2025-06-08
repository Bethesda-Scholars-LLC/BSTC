import nodemailer from "nodemailer";
import { MailOptions } from "nodemailer/lib/sendmail-transport";
import { Log } from "../util";
import "./firstLesson";

/**
 * @reminder Add new value every time new scheduled email type is created
 */
export enum EmailTypes {
    Referral="referral",
    ProfileComplete="profile_complete",
    FirstLesson="first_lesson",
    AwaitingBooking="awaiting_booking",
    AwaitingAvail="awaiting_availability",
    ContractorIncomplete="contractor_incomplete",
    Screening="screening"
}

export interface MailOpts extends MailOptions {
    email_type?: EmailTypes,
    client_id?: number,
    client_name?: string,
    contractor_id?: number,
    contractor_name?: string,
    job_id?: number
}

export const transporterPascal = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.PERSONAL_EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const transporterManager = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MANAGER_EMAIL_ADDRESS,
        pass: process.env.MANAGER_EMAIL_PASSWORD
    }
});

Log.bindTransporter(transporterPascal);