import { addTCListener } from "../integration/hook";
import { LessonObject } from "../integration/tc models/lesson/types";
import LessonModel, { ILesson } from "../models/lesson";
import { TCEvent } from "../types";

addTCListener("MARKED_APPOINTMENT_AS_COMPLETE", async (ev: TCEvent<any, LessonObject>) => {
    const lesson = ev.subject;
    const dbLessons = await LessonModel.find({cruncher_id: lesson.id}).exec();
    const localLessons = getLesson(lesson);
    if(dbLessons.length > 0) {
        await LessonModel.deleteMany({cruncher_id: lesson.id}).exec();
    }

    for(let i = 0; i < localLessons.length; i++) {
        await LessonModel.create(localLessons[i]);
    }
});

function getLesson(lesson: LessonObject): ILesson[] {
    const completedOn = new Date();
    return lesson.cjas.map(val => {
        return {
            tutor_id: val.contractor,
            completed_on: completedOn,
            cruncher_id: lesson.id,
            lesson_time: (new Date(lesson.start).getTime() - new Date(lesson.finish).getTime()) / (1000 * 60 * 60)
        };
    });
}
