import { Schema, model } from "mongoose";


export interface ILesson {
    cruncher_id: number,
    tutor_ids: number[],
    completed_on: Date,
    lesson_time: number,
}


const lessonSchema = new Schema<ILesson>({
    cruncher_id: Number,
    tutor_ids: Schema.Types.Array,
    completed_on: Date,
    lesson_time: Number
});

const LessonModel = model("tutors", lessonSchema);

export default LessonModel;
