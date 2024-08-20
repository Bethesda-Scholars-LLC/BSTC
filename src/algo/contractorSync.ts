import { Mutex } from "async-mutex";
import { Duration } from "ts-duration";
import { addTCListener } from "../integration/hook";
import { getContractorById, setTutorBias } from "../integration/tc models/contractor/contractor";
import { ContractorObject } from "../integration/tc models/contractor/types";
import LessonModel, { ILesson } from "../models/lesson";
import TutorModel, { ITutor } from "../models/tutor";
import { TCEvent } from "../types";
import { Log, getAttrByMachineName } from "../util";

const contractorLocks: {[key: number]: Mutex} = {};
const newLockLock = new Mutex();

export const gradePossibilities: {[key: string]: number} = {
    "1st-5th grade": 5,
    "6th grade": 6,
    "7th grade": 7,
    "8th grade": 8,
    "9th grade": 9,
    "10th grade": 10,
    "11th grade": 11,
    "12th grade": 12,
    "college freshman": 13,
    "college sophomore": 14,
    "college junior": 15,
    "college senior": 16
};

const skillsHierarchy = [
    "other",
    "gpa",
    "primary",
    "high school",
    "sat",
    "college",
    "ba",
    "bsc",
    "bachelor's (other)",
    "ma",
    "m.s.",
    "meng",
    "phd",
];


addTCListener([
    "EDITED_OWN_PROFILE",
    "CREATED_A_CONTRACTOR",
    "EDITED_A_CONTRACTOR",
    "CHANGED_CONTRACTOR_STATUS",
    "EDITED_SKILLS",
    "EDITED_QUALIFICATIONS",
    "ADDED_A_LABEL_TO_A_USER",
    "CONTRACTOR_SIGN_UP",
], updatedContractorFunc);

addTCListener("DELETED_A_CONTRACTOR", async (ev: TCEvent<ContractorObject>) => {
    const contractor = ev.subject;
    const lock = await getContractorLock(contractor.id);
    await lock.acquire();
    try {
        const tutor = await TutorModel.findOne({cruncher_id: contractor.id}).exec();
        Log.info(`successfully retrieved contractor object ${tutor?._id}`);
        // deleted but it doesn't matter
        if(!tutor) {
            lock.release();
            return;
        }
        tutor.deleted_on = new Date();

        await tutor.save();
        Log.info(`updated db with new contractor object ${tutor.id}`);
    } catch (e) {
        Log.error(e);
    } finally {
        lock.release();
    }
    Log.info("sucessfully executed all tasks for this webhook");
});

addTCListener("RECOVERED_A_CONTRACTOR", async (ev: TCEvent<ContractorObject>) => {
    const contractor = ev.subject;
    const lock = await getContractorLock(contractor.id);
    await lock.acquire();
    try {
        const tutor = await TutorModel.findOne({cruncher_id: contractor.id}).exec();
        Log.info(`sucessfully retrieved contractor object ${tutor?.id}`);
        if(!tutor) {
            const newTutor = tutorFromContractor(contractor);
            if(newTutor) {
                await TutorModel.create(newTutor);
                Log.info(`created in db new contractor object ${newTutor.cruncher_id}`);
            }
            lock.release();
            return;
        }

        tutor.deleted_on = undefined;
        tutor.save();
        Log.info(`updated contractor ${tutor.id} in db`);
    } catch (e) {
        Log.error(e);
    } finally {
        lock.release();
    }
    Log.info("sucessfully executed all tasks for this webhook");
});

async function updatedContractorFunc(ev: TCEvent<ContractorObject>) {
    const contractor = ev.subject;
    Log.info(`updating contractor function for contractor ${contractor.id}`);
    if(!("skills" in contractor)) {
        Log.info(`no skills found for contractor ${ev.subject.id}`);
        return;
    }
    await SyncContractor(contractor);
}

async function getContractorLock(contractor_id: number): Promise<Mutex> {
    Log.info(`getting contractor lock ${contractor_id}`);
    if(!contractorLocks[contractor_id]) {
        await newLockLock.acquire();
        if(!contractorLocks[contractor_id])
            contractorLocks[contractor_id] = new Mutex();
        
        newLockLock.release();
    }
    return contractorLocks[contractor_id];
}

export async function SyncContractorById(id: number) {
    Log.info(`syncing contractor by id ${id}`);
    const contractor = await getContractorById(id);
    if(!contractor) {
        Log.info(`no contractor found to sync ${id}`);
        return;
    }
    await SyncContractor(contractor);
}

export async function SyncContractor(contractor: ContractorObject) {
    Log.info(`syncing contractor with db ${contractor.id}`);
    const lock = await getContractorLock(contractor.id);
    await lock.acquire();
    try {
        const tutor = await TutorModel.findOne({cruncher_id: contractor.id}).exec();

        const newTutor = tutorFromContractor(contractor);

        if(!tutor) {
            if(!newTutor) {
                lock.release();
                Log.info(`no contractor found in db ${contractor.id}`);
                return;
            }
            TutorModel.create(newTutor);
            lock.release();
            Log.info(`sucessfully created new contractor in db ${newTutor.cruncher_id}`);
            return;
        }

        let biasField: string | null = "bias";
        // on approved
        if(contractor.status.toLowerCase() !== tutor.status && contractor.status.toLowerCase() === "approved") {
            tutor.bias = 1;
            await setTutorBias(contractor, 1);
            // overwrite bias in case it was set to 0 on frontend
            biasField = null;
            tutor.date_approved = new Date();
        }
        if(biasField) {
            if(newTutor!.bias !== tutor.bias) {
                tutor.bias = newTutor!.bias;
            }
        }

        // attributes we want to check when tutor updates account
        [
            "first_name",
            "last_name",
            "school_full_name",
            "lat",
            "lon",
            "grade",
            "total_paid_hours",
            "work_ready",
            "stars",
            "gender",
            "phone_number",
            "skills",
            "gpa",
            "status"
        ].forEach((field: string | null) => {
            if(!field)
                return;
            (tutor as any)[field] = (newTutor as any)[field];
        });

        await tutor.save();
        Log.info(`sucessfully saved updated contractor ${tutor.id} in db`);
    } catch (e) {
        Log.error(e);
    } finally {
        lock.release();  // Ensure lock is released
    }
}

function tutorFromContractor(con: ContractorObject): ITutor | null {
    Log.info(`building new contractor object ${con.id}`);
    try {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const grade = getAttrByMachineName("grade_1",  con.extra_attrs);
        const gradeNum = gradePossibilities[grade?.value.toLowerCase()];
        const gender = getAttrByMachineName("contractor_gender", con.extra_attrs)?.value.toLowerCase();
        const parsedGpa = parseFloat(getAttrByMachineName("unweighted_gpa_1", con.extra_attrs)?.value);
        let genderNum;
        if(!gender){
            genderNum = undefined;
        }else if(gender === "male") {
            genderNum = 0;
        } else if(gender === "female") {
            genderNum = 1;
        } else {
            genderNum = 2;
        }
        let biasValue = parseInt(getAttrByMachineName("bias", con.extra_attrs)?.value);
        if(isNaN(biasValue)) {
            biasValue = 1;
        }
        // .map(val => {return {...val, qual_level: [val.qual_level]};})
        Log.info(`returning new contractor object ${con.id}`);
        return {
            first_name: con.user.first_name,
            last_name: con.user.last_name,
            cruncher_id: con.id,
            deleted_on: undefined,

            recent_notifications: 0,
            recent_notifications_valid_until: new Date(Date.now() + Duration.hour(24 * 14).milliseconds),

            applications_accepted: 0,
            applications_accepted_valid_until: new Date(Date.now() + Duration.hour(24 * 14).milliseconds),

            school_full_name: getAttrByMachineName("school_1", con.extra_attrs)?.value,
            date_created: new Date(con.user.date_created),

            lat: con.user.latitude,
            lon: con.user.longitude,
            grade: gradeNum,

            recent_hours: 0,

            total_paid_hours: con.work_done_details ? convertPaidHours(typeof con.work_done_details.total_paid_hours === "number" ? "" : con.work_done_details.total_paid_hours) : undefined,

            work_ready: {
                w9_filled_out: checkBoolExtraAttr(con.extra_attrs, "w9_filled_out")??false,
                on_remindme: checkBoolExtraAttr(con.extra_attrs, "on_remindme")??false,
                contract_filled_out: checkBoolExtraAttr(con.extra_attrs, "contract_filled_out")??false,
            },

            bias: biasValue,
            stars: getAttrByMachineName("rating", con.extra_attrs)?.value.split("/")[0],
            gender: genderNum,
            phone_number: (con.user.mobile??con.user.phone)??undefined,
            // only keep the highest skill level for any given subject
            skills: con.skills
                .reduce((prev: {id: number, subject: string, qual_level: string}[], cur) => {
                    let merged = false;
                    for(let i = 0; i < prev.length; i++) {
                        if(prev[i].subject === cur.subject) {
                            merged = true;
                            const newLevel = skillsHierarchy.indexOf(cur.qual_level.toLowerCase());
                            if(newLevel > skillsHierarchy.indexOf(prev[i].qual_level.toLowerCase()))
                                prev[i].qual_level = cur.qual_level;
                        }
                    }
                    if(merged)
                        return prev;
                    return [...prev, cur];
                }, []).map(val => {
                    return {
                        subject: val.subject,
                        skillLevel: skillsHierarchy.indexOf(val.qual_level.toLowerCase()),
                        levelName: val.qual_level.toLowerCase()
                    };
                }),
            gpa: isNaN(parsedGpa) ? undefined : parsedGpa,
            status: con.status
        };
    } catch(e) {
        Log.error(e);
        return null;
    }
    /* eslint-enable */
}

export async function addTutorHours(lesson: ILesson) {
    Log.info(`adding tutor hours from lesson ${lesson.cruncher_id}`);
    const lock = await getContractorLock(lesson.tutor_id);
    lock.acquire();
    try {
        const tutor = await TutorModel.findOne({cruncher_id: lesson.tutor_id}).exec();
        if(!tutor) {
            lock.release();
            return;
        }

        if(!tutor.hours_valid_until) {
            tutor.hours_valid_until = new Date(lesson.completed_on.getTime() + Duration.hour(24 * 30).milliseconds);
            tutor.recent_hours += lesson.lesson_time;
        } else if (new Date().getTime() > tutor.hours_valid_until.getTime()) {
            const [validUntil, hours] = await syncTutorHours(tutor);
            tutor.hours_valid_until = validUntil;
            tutor.recent_hours = hours;
        } else {
            tutor.recent_hours += lesson.lesson_time;
        }

        await tutor.save();
        Log.info(`sucessfully saved tutor ${tutor.cruncher_id} to database`);
    } catch (e) {
        Log.error(e);
    } finally {
        lock.release();
    }
}

export async function syncTutorHours(tutor: ITutor): Promise<[Date, number]> {
    Log.info(`syncing tutor hours for contractor ${tutor.cruncher_id}`);
    // get tutor lessons sorted in ascending order by date completed
    const tutorLessons = await LessonModel.find({tutor_id: tutor?.cruncher_id}, undefined, {sort: {completed_on: 1}}).exec();
    // purge all lessons at beginning of array that are before 30 day cutoff
    for(;;) {
        if(tutorLessons.length === 0 || (tutorLessons[0].completed_on.getTime()) > (new Date().getTime() - Duration.hour(30 * 24).milliseconds) )
            break;
        tutorLessons.shift();
    }

    // get oldest lesson completed on time and then add 30 days
    const validUntil = new Date((tutorLessons[0]?.completed_on ?? new Date()).getTime() + Duration.hour(30 * 24).milliseconds);
    let totalHours = 0;
    for(let i = 0; i < tutorLessons.length; i++) {
        totalHours += tutorLessons[i].lesson_time;
    }

    return [validUntil, totalHours];
}

function checkBoolExtraAttr(extra_attrs: any, attr: string): boolean | undefined {
    Log.info(`checking bool extra attr for attr=${attr}`);
    const walue = getAttrByMachineName(attr, extra_attrs);
    if(!walue) {
        return undefined;
    }
    return walue.value.toLowerCase() === "true";
}

const paidHoursRE = new RegExp(/^([0-9]+ )?[0-9]{2}:[0-9]{2}:[0-9]{2}$/);
function convertPaidHours(paidHours: string): number {
    Log.info(`converting paid hours with paidHours=${paidHours}`);
    if(!paidHours.match(paidHoursRE))
        return 0;
    let hours = 0;
    if(paidHours.includes(" ")) {
        const splPaidHours = paidHours.split(" ");
        hours += parseInt(splPaidHours[0])*24;
        paidHours = splPaidHours[1];
    }
    const splHours = paidHours.split(":");
    hours += parseInt(splHours[0]);
    hours += parseInt(splHours[1])/60;
    return hours;
}

