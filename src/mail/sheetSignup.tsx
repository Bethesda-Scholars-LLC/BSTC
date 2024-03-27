import React from "react";
import ReactDOMServer from "react-dom/server";
import { Log } from "../util";
import { MailOptions } from "nodemailer/lib/json-transport";

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// move this model to somewhere else
interface RecipientData {
    "Student Name": string;
    "Submitted On": string;
    "Class Name": string;
    "Name": string;
    // add whatever more fields
  }

const sheetSignup = (recipient: any) => {
    return {
        from: process.env.USER_EMAIL,
        to: recipient.Email,
        subject: `${recipient["Class Name"] ?? "not found"} Signup`,
        // html: ReactDOMServer.renderToString(<SheetSignupTemplate recipient={recipient}/>),
    };
};

const SheetSignupTemplate = ([recipient]: [RecipientData, string]) => {
    let studentName = recipient["Student Name"];
    if(recipient["Student Name"].includes(" ")) {
        studentName = recipient["Student Name"].split(" ")[0];
    }
    const date = new Date(recipient["Submitted On"]);
    date.setDate(date.getDate() + 7);
    const day = daysOfWeek[date.getDay()];
    Log.debug(date.getDay());
    
    return <p style={{margin: 0}}>
        Hi {recipient.Name},
        <br/>
        <br/>
        Thank you for registering for the Intro to {recipient["Class Name"]} Class from August 7-11! Please make sure to pay before next {day} ({date.getMonth() + 1}/{date.getDate()}) to secure {studentName}'s spot in the class. Pay here with Stripe: https://buy.stripe.com/dR6dRQ24Oayt8Ni4gl.
        <br/>
        <br/>
        Please note that there is a $9 credit card fee for paying by Stripe. If this is an issue, you can send the money through Zelle to Bethesda Scholars LLC through the email: pascal@bethesdascholars.com
        <br/>
        <br/>
        Feel free to tell anyone you know who would be interested about the class - it would make the class more fun for your child if they have a friend, and it would help us get signups. We will send another email in mid to late July with specific details.
        <br/>
        <br/>
    </p>;
};

export default SheetSignupTemplate;