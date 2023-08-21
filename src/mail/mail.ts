import nodemailer from "nodemailer";
import { MailOptions } from "nodemailer/lib/sendmail-transport";
import "./firstLesson";

/**
 * @reminder Add new value every time new scheduled email type is created
 */
export enum EmailTypes {
    Referral="referral",
    FirstLesson="first_lesson",
    MatchedNotBooked="matched_not_booked"
}

export interface MailOpts extends MailOptions {
    email_type?: EmailTypes
}

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.PERSONAL_EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD
    }
});

