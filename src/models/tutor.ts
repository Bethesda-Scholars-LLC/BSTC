import { Schema, Types, model } from "mongoose";

export class TutorSubject {
    constructor (public subject: string, public skillLevel: number) { }
}

export interface TutorSkill {
    subject: string,
    skillLevel: number
}

export enum TutorGender {
    Male=0,
    Female=1,
    Other=2
}

export enum TutorStatus {
    Pending=0,
    Approved=1,
    Rejected=2,
    Dormant=3
}

export interface ITutor {
    _id: Types.ObjectId
    lat: number,
    lon: number,
    grade: number,
    bias: number,
    stars: number,
    dateApproved: Date,

    // per week on average
    lessonFrequency: number,

    gender: TutorGender,

    skills: TutorSkill[],
    gpa: number,

    tutor_id: number,
    status: number,
}

const tutorSchema = new Schema<ITutor>({
    _id: {
        type: Schema.Types.ObjectId,
        required: true,
        auto: true,
    },
    lat: {
        type: Number
    },
    lon: {
        type: Number
    },
    grade: {
        type: Number
    },
    bias: {
        type: Number
    },
    stars: {
        type: Number
    },
    dateApproved: Number,
    lessonFrequency: Number,
    gender: Number,
    skills: Types.Array,
    gpa: Number,
    tutor_id: Number,
    status: Number,

});

const TutorModel = model("tutors", tutorSchema);

export default TutorModel;