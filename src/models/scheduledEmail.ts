import { Schema, model, Types } from "mongoose";

export interface IScheduledMail {
    _id: Types.ObjectId
    send_at: Date
    from: string
    to: string
    cc?: string
    bcc?: string
    subject?: string
    html?: string
    sender?: string
}

const scheduledEmailSchema = new Schema<IScheduledMail>({
    _id: {
        type: Schema.Types.ObjectId,
        required: true,
        auto: true,
    },
    send_at: {
        type: Date,
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
    sender: String
});

const ScheduleMail = model("scheduled_email", scheduledEmailSchema);

export default ScheduleMail;