import { Schema, Types, model } from "mongoose";

export interface IScheduledMail {
    _id: Types.ObjectId
    send_at: Date
    from: string
    to: string
    cc?: string
    bcc?: string
    subject?: string
    html?: string
    sender?: string,
    email_type?: string,
    client_id?: number,     // these fields and below are for awaiting booking clients
    client_name?: string,
    contractor_id?: number,
    contractor_name?: string,
    job_id?: number
}

const scheduledEmailSchema = new Schema<IScheduledMail>({
    _id: {
        type: Schema.Types.ObjectId,
        required: true,
        auto: true,
    },
    send_at: {
        type: Date,
        index: true,
        required: true
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    cc: String,
    bcc: String,
    subject: String,
    html: String,
    sender: String,
    email_type: String,
    client_id: Number,
    client_name: String,
    contractor_id: Number,
    contractor_name: String,
    job_id: Number
});

const ScheduleMail = model("scheduled_email", scheduledEmailSchema);

export default ScheduleMail;