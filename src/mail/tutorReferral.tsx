import React, { CSSProperties } from "react";
import ReactDOMServer from "react-dom/server";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { getUserFirstName } from "../integration/tc models/user/user";
import { BUSINESS_EMAIL_FROM, PROD } from "../util";
import { EmailTypes, MailOpts } from "./mail";

export const tutorReferralMail = (contractor: ContractorObject): MailOpts => {
    return {
        from: BUSINESS_EMAIL_FROM,
        to: PROD ? contractor.email : (process.env.TEST_EMAIL_ADDRESS ?? contractor.email),
        email_type: EmailTypes.Referral,
        subject: "Referral Program",
        html: ReactDOMServer.renderToString(<ReferralEmail contractor={contractor}/>)
    };
};

const ReferralEmail = (props: {contractor: ContractorObject}) => {
    const mediumIndent: CSSProperties = {
        paddingLeft: "20px"
    };
    return <p style={{margin: 0}}>
        Hi {getUserFirstName(props.contractor)},
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
                We will add <b>$15</b> to your monthly pay--see criteria below.
            </li>
        </ol>
        <b>To receive your referral payment, the tutor you refer us must:</b>
        <ol style={mediumIndent}>
            <li>
                Pass our screening process.
            </li>
            <li>
                Be a high school senior or high school junior or college student.
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
