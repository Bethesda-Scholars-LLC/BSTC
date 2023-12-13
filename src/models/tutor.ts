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
    // exponentially drops off, 25 mins should be 0
    lat?: number,
    lon?: number,

    // hard filter 2 year gap
    grade?: number,

    // undefined so far
    bias: number,

    // 4 can tutor AP level or high level like calc
    // 3 high school subjects (bio, chem, alg 2, precalc)
    // 2 low level subjects
    // 1 good with kids
    stars?: number,
    // TODO: delete
    date_approved?: Date,

    // negative sigmoid
    recent_hours: number,
    hours_valid_until?: Date,

    phone_number?: string,
    // 0 is positively weighed
    total_paid_hours?: number,
    work_ready: IWorkReady,

    // weigh same gender closer
    gender?: number,

    // weigh tutors with skill 10% better
    skills: TutorSkill[],
    // piecewise but you don't lose for having bad gpa
    gpa?: number,

    // hard filter for approved
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
    total_paid_hours: Number,
    work_ready: WorkReadySchema,

    gender: Number,

    skills: Schema.Types.Array,
    gpa: Number,

    status: {
        type: String,
        index: true
    },
});

const TutorModel = model("tutors", tutorSchema);

export default TutorModel;