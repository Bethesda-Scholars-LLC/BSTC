import { Schema, model } from "mongoose";


export interface ILesson {
    cruncher_id: number,
    tutor_id: number,
    completed_on: Date,
    // hours
    lesson_time: number,
}


const lessonSchema = new Schema<ILesson>({
    cruncher_id: Number,
    tutor_id: Number,
    completed_on: Date,
    lesson_time: Number
});

const LessonModel = model("lessons", lessonSchema);

export default LessonModel;
