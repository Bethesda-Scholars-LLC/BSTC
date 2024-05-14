import React from "react";

function ManagerSignature() {
    return (<>
        <b>{process.env.MANAGER_EMAIL_FROM}</b>
        <br/>
        {process.env.MANAGER_SIGNATURE_DESCRIPTION}
        <br/>
        _________________________________
        <br/>
        <b>Website</b>: https://www.bethesdascholars.com
        <br/>
        <b>Mobile</b>: {process.env.MANAGER_MOBILE}
    </>);
}

export default ManagerSignature;