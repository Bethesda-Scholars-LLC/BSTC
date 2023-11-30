import { Schema, model } from "mongoose";

export class TutorSubject {
    constructor (public subject: string, public skillLevel: number) { }
}

export interface TutorSkill {
    subject: string,
    skillLevel: number,
    levelName: string
}

export enum TutorGender {
    Male=0,
    Female=1,
    Other=2
}

export interface ITutor {
    cruncher_id: number,
    lat: number,
    lon: number,
    grade: number,
    bias: number,
    stars: number,
    dateApproved?: Date,

    // per week on average
    lessonFrequency?: number,

    gender: number,

    skills: TutorSkill[],
    gpa: number,

    status: string,
}

const tutorSchema = new Schema<ITutor>({
    lat: Number,
    lon: Number,
    grade: Number,
    bias: Number,
    stars: Number,
    dateApproved: Number,
    lessonFrequency: Number,
    gender: Number,
    skills: Schema.Types.Array,
    gpa: Number,
    cruncher_id: Number,
    status: String,

});

const TutorModel = model("tutors", tutorSchema);

export default TutorModel;