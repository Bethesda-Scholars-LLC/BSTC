import { Mutex } from "async-mutex";
import { addTCListener } from "../integration/hook";
import { ContractorObject } from "../integration/tc models/contractor/types";
import TutorModel, { ITutor } from "../models/tutor";
import { TCEvent } from "../types";
import { Log, PROD, getAttrByMachineName } from "../util";

const contractorLocks: {[key: number]: Mutex} = {};
const newLockLock = new Mutex();

const updatedContractorFunc = (ev: TCEvent<any, ContractorObject>) => {
    const contractor = ev.subject;
    if(!("skills" in contractor)) {
        return;
    }
    Log.debug(contractor.skills);
    SyncContractor(contractor);
};

const SyncContractor = async (contractor: ContractorObject) => {
    if(!contractorLocks[contractor.id]) {
        await newLockLock.acquire();
        if(!contractorLocks[contractor.id])
            contractorLocks[contractor.id] = new Mutex();
        
        await newLockLock.release();
    }
    const lock = contractorLocks[contractor.id];
    await lock.acquire();
    try {
        const tutor = await TutorModel.findOne({cruncher_id: contractor.id}).exec();

        if(!tutor) {
            const fromContractor = tutorFromContractor(contractor);
            TutorModel.create(fromContractor);
            return;
        }

        const newTutor = tutorFromContractor(contractor);
        if(contractor.status.toLowerCase() !== tutor.status && contractor.status.toLowerCase() === "approved")
            tutor.dateApproved = new Date();

        tutor.lat = newTutor.lat;
        tutor.lon = newTutor.lon;
        tutor.grade = newTutor.grade;
        tutor.stars = newTutor.stars;
        tutor.gender = newTutor.gender;
        tutor.skills = newTutor.skills;
        tutor.gpa = newTutor.gpa;
        tutor.status = newTutor.status;

        await tutor.save();
    } catch (e) {
        Log.error(e);
    }
    lock.release();
};

const gradePossibilities: {[key: string]: number} = {
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

const tutorFromContractor = (con: ContractorObject): ITutor => {
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const grade = getAttrByMachineName("grade_1",  con.extra_attrs)!;
    const gradeNum = gradePossibilities[grade.value.toLowerCase()];
    const gender = getAttrByMachineName("contractor_gender", con.extra_attrs)!.value.toLowerCase();
    let genderNum;
    if(gender === "male") {
        genderNum = 0;
    } else if(gender === "female") {
        genderNum = 1;
    } else {
        genderNum = 2;
    }
    
    // .map(val => {return {...val, qual_level: [val.qual_level]};})
    return {
        cruncher_id: con.id,
        lat: con.user.latitude,
        lon: con.user.longitude,
        grade: gradeNum,
        bias: 0,
        stars: getAttrByMachineName("rating", con.extra_attrs)!.value.split("/")[0],
        gender: genderNum,
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
        gpa: getAttrByMachineName("unweighted_gpa_1", con.extra_attrs)!.value,
        status: con.status
    };
    /* eslint-enable */
};

[
    "EDITED_OWN_PROFILE",
    "CREATED_A_CONTRACTOR",
    "EDITED_A_CONTRACTOR",
    "DELETED_A_CONTRACTOR",
    "CHANGED_CONTRACTOR_STATUS",
    "EDITED_SKILLS",
    "EDITED_QUALIFICATIONS",
    "REMOVED_CONTRACTOR_FROM_SERVICE",
    "RECOVERED_A_CONTRACTOR",
    "ADDED_A_LABEL_TO_A_USER",
    "CONTRACTOR_SIGN_UP",
].forEach(evName => {
    // just in case this gets merged to master
    if(!PROD) {
        addTCListener(evName, updatedContractorFunc);
    }
});



