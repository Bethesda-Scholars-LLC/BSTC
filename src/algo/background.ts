import { addTCListener } from "../integration/hook";
import { ContractorObject } from "../integration/tc models/contractor/types";
import { TCEvent } from "../types";

addTCListener("EDITED_OWN_PROFILE", (ev: TCEvent<any, ContractorObject>) => {
    const contractor = ev.subject;
});
