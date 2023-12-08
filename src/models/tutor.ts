import { Schema, model } from "mongoose";

export interface TutorSkill {
    subject: string,
    skillLevel: number,
    levelName: string
}

export interface IWorkReady {
    w9_filled_out: boolean,
    on_remindme: boolean,
    contract_filled_out: boolean,
}

export interface ITutor {
    first_name?: string,
    last_name: string,
    cruncher_id: number,
    deleted_on?: Date,
    lat: number,
    lon: number,
    grade?: number,
    bias: number,
    stars?: number,
    date_approved?: Date,

    recent_hours: number,
    hours_valid_until?: Date,

    phone_number?: string,
    total_paid_hours?: string,
    work_ready: IWorkReady,

    gender?: number,

    skills: TutorSkill[],
    gpa?: number,

    status: string,
}

const WorkReadySchema = new Schema<IWorkReady>({
    w9_filled_out: Boolean,
    on_remindme: Boolean,
    contract_filled_out: Boolean,
});

const tutorSchema = new Schema<ITutor>({
    first_name: String,
    last_name: {
        type: String,
        required: true,
    },
    cruncher_id: {
        type: Number,
        required: true,
    },
    deleted_on: Date,
    lat: Number,
    lon: Number,
    grade: Number,
    bias: {
        type: Number,
        required: true,
    },
    stars: Number,
    date_approved: Date,

    recent_hours: {
        type: Number,
        required: true,
    },
    hours_valid_until: Date,

    phone_number: String,
    total_paid_hours: String,
    work_ready: WorkReadySchema,

    gender: Number,

    skills: Schema.Types.Array,
    gpa: Number,

    status: String,
});

const TutorModel = model("tutors", tutorSchema);

export default TutorModel;