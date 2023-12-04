import { addTCListener } from "../integration/hook";
import { LessonObject } from "../integration/tc models/lesson/types";
import { TCEvent } from "../types";

addTCListener("MARKED_APPOINTMENT_AS_COMPLETE", (ev: TCEvent<any, LessonObject>) => {
    const lesson = ev.subject;
    // const tutor_ids = lesson.cjas.map(val => val.contractor);

});
