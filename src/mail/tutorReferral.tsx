import { MailOptions } from "nodemailer/lib/sendmail-transport";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { BUSINESS_EMAIL_FROM, PROD } from "../util";
import React from "react";
import { getUserFirstName } from "../integration/tc models/user/user";
import ReactDOMServer from "react-dom/server";

export const tutorReferralMail = (contractor: ContractorObject): MailOptions => {
    return {
        from: BUSINESS_EMAIL_FROM,
        to: PROD ? contractor.user.email : (process.env.TEST_EMAIL_ADDRESS ?? contractor.user.email),
        cc: process.env.BUSINESS_EMAIL_ADDRESS,
        subject: "Bethesda Scholars Referral Program",
        html: ReactDOMServer.renderToString(<ReferralEmail contractor={contractor}/>)
    };
};

const ReferralEmail = (props: {contractor: ContractorObject}) => {
    return <p>
        Hi {getUserFirstName(props.contractor.user)},
        <br/>
        Bethesda scholars has a referral program. You are the goat that has been chosen for it. you will grow our business
        20x in 1 year because thats how good you are. now give everyone this code: <b>{props.contractor.id}</b>
    </p>;
};
