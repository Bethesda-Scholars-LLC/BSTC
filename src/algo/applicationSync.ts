import { addTCListener } from "../integration/hook";
import { ApplicationObject } from "../integration/tc models/application/types";
import ApplicationModel, { IApplication } from "../models/applications";
import { TCEvent } from "../types";
import { Log } from "../util";

[
    "APPLIED_FOR_SERVICE",
    "EDITED_APPLICATION_FOR_SERVICE",
    "TENDER_WAS_DECLINED",
    "WITHDREW_APPLICATION_FOR_SERVICE",
    "TENDER_WAS_ACCEPTED",
].forEach((eventName) => {
    addTCListener(eventName, (ev) => syncApplication(eventName === "TENDER_WAS_ACCEPTED", ev));
});

async function syncApplication(wasAccepted: boolean, applicationEvent: TCEvent<ApplicationObject>): Promise<IApplication> {
    Log.info("syncing application with database and applicationEvent");
    const application = applicationEvent.subject;
    const app = await ApplicationModel.findOne({tutor_id: application.contractor.id, job_id: application.service.id}).exec();
    if(!app) {
        Log.info("creating new db application with applicationEvent");
        return ApplicationModel.create({
            status: application.status,
            job_id: application.service.id,
            date_accepted: wasAccepted ? new Date() : undefined,
            tutor_id: application.contractor.id
        });
    }
    app.status = application.status;
    if(wasAccepted) {
        app.date_accepted = new Date();
    }
    await app.save();
    Log.info(`sucessfully saved new application to database with job_id=${app.job_id} and tutor_id=${app.tutor_id}`);
    return app;
}
