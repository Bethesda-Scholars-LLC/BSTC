import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();

if(!process.env.API_KEY){
    console.log("Please add 'API_KEY' to .env");
    process.exit(-1);
}

/**
 * @description Api headers to send to TutorCruncher API
 */
export const apiHeaders = {
    Authorization: `token ${process.env.API_KEY}`
};

const baseUrl = "https://secure.tutorcruncher.com/api/";

/**
 * @param path Route Path
 * @returns {string} full api request url
 * @description Takes route path, and appends it to end of base URL so you dont have to worry about it
 */
export const apiUrl = (path: string) => baseUrl + path.padStart(1, "/").substring(1);

export const mailTransporter = () => {                      // where emails will be sent from
    const transporter = nodemailer.createTransport({
        service: "gmail",                                 // service provider for this email
        auth: {
            user: process.env.EMAIL_ADDRESS,               // username and password for the email
            pass: process.env.EMAIL_PASSWORD
        }
    });
    return transporter;
};

export const sendVerification = (user: any) => {        // sends verification email
    const transporter = mailTransporter();

    const mailOptions = {
        from: '"FFSD Email Verification" <`process.env.EMAIL_ADDRESS`>',    // change title and email here
        to: "pascalbell16@gmail.com",
        subject: "",                                // change subject here
        html: `<h>Hello ${user.first_name}</h>
            <p> Thank you for registering! Please click below to verify your email adress and proceed to payment:</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) return console.log(error);
        console.log("verification sent");
    });
}