import nodemailer from "nodemailer";
import "./firstLesson";

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.PERSONAL_EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD
    }
});

