import { Schema, model } from "mongoose";


export interface IApplication {
    tutor_id: number,
    status: string,
    job_id: number,
    date_accepted?: Date,
}

const applicationSchema = new Schema<IApplication>({
    tutor_id: {
        type: Number,
        required: true,
        index: true,
    },
    job_id: {
        type: Number,
        required: true,
        index: true,
    },
    status: {
        type: String,
        required: true,
    },
    date_accepted: {
        type: Date,
    },
});

const ApplicationModel = model("applications", applicationSchema);

export default ApplicationModel;
