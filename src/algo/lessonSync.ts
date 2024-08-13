import { Duration } from "ts-duration";
import { addTCListener } from "../integration/hook";
import { LessonObject } from "../integration/tc models/lesson/types";
import LessonModel, { ILesson } from "../models/lesson";
import { TCEvent } from "../types";
import { addTutorHours } from "./contractorSync";
import { Log } from "../util";

addTCListener("MARKED_AN_APPOINTMENT_AS_COMPLETE", async (ev: TCEvent<LessonObject>) => {
    const lesson = ev.subject;
    const dbLessons = await LessonModel.find({cruncher_id: lesson.id}).exec();
    Log.info(`successfully retrieved lesson object from DB ${lesson.id}`);
    const localLessons = getLesson(lesson);
    if(dbLessons.length > 0) {
        Log.info("db lesson has length 0");
        return;
    }

    for(let i = 0; i < localLessons.length; i++) {
        await LessonModel.create(localLessons[i]);
        Log.info("sucessfully created local lesson");
        await addTutorHours(localLessons[i]);
        Log.info("sucessfully added to tutor hours");
    }
    Log.info("sucessfully executed all tasks for this webhook");
});

function getLesson(lesson: LessonObject): ILesson[] {
    const completedOn = new Date();
    return lesson.cjas.map(val => {
        return {
            tutor_id: val.contractor,
            completed_on: completedOn,
            cruncher_id: lesson.id,
            lesson_time: Duration.millisecond(new Date(lesson.finish).getTime() - new Date(lesson.start).getTime()).hours
        };
    });
}
