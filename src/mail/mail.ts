import nodemailer from "nodemailer";
import { MailOptions } from "nodemailer/lib/sendmail-transport";
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
    ContractorIncomplete="contractor_incomplete"
}

export interface MailOpts extends MailOptions {
    email_type?: EmailTypes,
    client_id?: number,
    client_name?: string,
    contractor_id?: number,
    contractor_name?: string,
    job_id?: number
}

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.PERSONAL_EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD
    }
});

