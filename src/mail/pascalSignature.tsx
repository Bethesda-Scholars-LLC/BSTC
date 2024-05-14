import React from "react";

function PascalSignature() {
    return (<>
        <b>{process.env.PERSONAL_EMAIL_FROM}</b>
        <br/>
        {process.env.SIGNATURE_DESCRIPTION}
        <br/>
        _________________________________
        <br/>
        <b>Website</b>: https://www.bethesdascholars.com
        <br/>
        <b>Mobile</b>: 202-294-6538
    </>);
}

export default PascalSignature;