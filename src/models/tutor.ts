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
    first_name: string,
    last_name: string,
    cruncher_id: number,
    deleted_on?: Date,
    lat: number,
    lon: number,
    grade: number,
    bias: number,
    stars: number,
    dateApproved?: Date,

    recent_hours: number,
    hours_valid_until: Date,

    total_paid_hours: string,
    work_ready: IWorkReady,

    gender: number,

    skills: TutorSkill[],
    gpa: number,

    status: string,
}

const WorkReadySchema = new Schema<IWorkReady>({
    w9_filled_out: Boolean,
    on_remindme: Boolean,
    contract_filled_out: Boolean,
});

const tutorSchema = new Schema<ITutor>({
    first_name: String,
    last_name: String,
    cruncher_id: Number,
    deleted_on: Date,
    lat: Number,
    lon: Number,
    grade: Number,
    bias: Number,
    stars: Number,
    dateApproved: Number,

    recent_hours: Number,
    hours_valid_until: Date,

    total_paid_hours: String,
    work_ready: WorkReadySchema,

    gender: Number,

    skills: Schema.Types.Array,
    gpa: Number,

    status: String,
});

const TutorModel = model("tutors", tutorSchema);

export default TutorModel;