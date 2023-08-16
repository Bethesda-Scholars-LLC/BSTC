import { MailOptions } from "nodemailer/lib/sendmail-transport";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { BUSINESS_EMAIL_FROM, PROD } from "../util";
import React, { CSSProperties } from "react";
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
    const mediumIndent: CSSProperties = {
        paddingLeft: "20px"
    };
    return <p style={{margin: 0}}>
        Hi {getUserFirstName(props.contractor.user)},
        <br/>
        <br/>
        Welcome to Bethesda Scholars' Referral Program. Tell your friends to sign up as a tutor!
        <br/>
        <br/>
        <b>How it works:</b>
        <ol style={mediumIndent}>
            <li>
                Your referral code is <b style={{backgroundColor: "yellow"}}>{props.contractor.id}</b>. Give this to a friend to sign up with.
            </li>
            <li>
                Have your friend put your referral code in their profile under the "Referral Code" field.
            </li>
            <li>
                We will add <b>$10</b> to your monthly pay--see criteria below.
            </li>
        </ol>
        <b>To recieve your referral payment, the tutor you refer us must:</b>
        <ol style={mediumIndent}>
            <li>
                Pass our screening process.
            </li>
            <li>
                Be a high school senior.
            </li>
            <li>
                Attend either Walt Whitman HS or Bethesda Chevy Chase HS in Bethesda, MD.
            </li>
        </ol>
        If you have any questions, feel free to reply directly to this email.
        <br/>
        <br/>
        Thanks,
        <br/>
        {process.env.BUSINESS_EMAIL_FROM}
    </p>;
};
