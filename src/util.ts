import dotenv from "dotenv";
import fs from "fs";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import path from "path";
import { Duration } from "ts-duration";
import { ExtraAttr } from "./types";
dotenv.config();

export const ON_ERROR: string[] = process.env.ON_ERROR?.split(",")??[process.env.PERSONAL_EMAIL_ADDRESS!];

export namespace Log {
    let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
    export const bindTransporter = (t: nodemailer.Transporter<SMTPTransport.SentMessageInfo>) => {
        transporter = t;
    };
    /* eslint-disable no-console */
    export const error = (message?: any, ...optionalParams: any[]) => {
        if(PROD && transporter) {
            const dateStr = new Date().toLocaleString().replace(/\/20[0-9]{2},/g, "").replace(/:[0-9]{2} /, "").toLowerCase();
            transporter.sendMail({
                from: process.env.MANAGER_EMAIL_ADDRESS,
                to: ON_ERROR[0],
                cc: [
                    ...ON_ERROR.slice(1)
                ],
                text: `[BSTC ${dateStr}] Erorr ${message}`
            });
            /*
            */
        }
        console.error(message, ...optionalParams);
    };

    export const info = (message?: any, ...optionalParams: any[]) => {
        console.error(message, ...optionalParams);
    };

    export const debug = (message?: any, ...optionalParams: any[]) => {
        if(!PROD)
            console.debug(message, ...optionalParams);
    };
    /* eslint-enable */
}

/**
 * @description required fields in the .env
 */
const requiredEnvs = [
    "API_KEY",
    "GEOCODE_API_KEY",
    "EMAIL_PASSWORD",
    "PERSONAL_EMAIL_ADDRESS",
    "PERSONAL_EMAIL_FROM",
    "BUSINESS_EMAIL_ADDRESS",
    "BUSINESS_EMAIL_FROM",
    "ORIGIN_URL",
    "SIGNATURE_DESCRIPTION",

    "MANAGER_EMAIL_ADDRESS",
    "MANAGER_EMAIL_PASSWORD",
    "MANAGER_EMAIL_FROM",
    "MANAGER_SIGNATURE_DESCRIPTION",
    "MANAGER_MOBILE",

    "DB_NAME",
    "DB_URI",
];

const envKeys = Object.keys(process.env);
export const PROD = ["production", "prod"].includes(process.env.NODE_ENV?.toLowerCase() ?? ""); // eslint-disable-line
export const TEST = ["testing", "test"].includes(process.env.NODE_ENV?.toLowerCase() ?? ""); // eslint-disable-line

export const DIR_ROOT = path.join(__dirname, ".."); // eslint-disable-line

if(requiredEnvs.reduce((prev, val) => {
        return prev || !envKeys.includes(val);
    }, false)
){
    const missingFields = requiredEnvs.filter(v => !envKeys.includes(v));
    if(missingFields.length === 1){
        Log.debug(missingFields[0]+" is required in the env and it is missing");
    } else {
        Log.debug(missingFields.reduce(
            (prev: string, v: string, i: number, arr: string[]) => prev+(i === arr.length-1 ? `and ${v}` : `${v}, `), ""
        )+" are required in the .env and they are missing");
    }
    process.exit(-1);
}

export const BUSINESS_EMAIL_FROM = `"Bethesda Scholars" <${process.env.BUSINESS_EMAIL_ADDRESS}>`; // eslint-disable-line
export const MANAGER_EMAIL_FROM = `"${process.env.MANAGER_EMAIL_FROM}" <${process.env.MANAGER_EMAIL_ADDRESS}>`;
export const PERSONAL_EMAIL_FROM = `"${process.env.PERSONAL_EMAIL_FROM}" <${process.env.PERSONAL_EMAIL_ADDRESS}>`;

export const DB_URI = process.env.DB_URI! + getDbUri(); // eslint-disable-line

function getDbUri(): string {
    /* eslint-disable */
    if(PROD)
        return process.env.DB_NAME!;
    if(process.env.NODE_ENV === "testing")
        return process.env.DB_TEST_NAME!;
    return process.env.DB_DEV_NAME!;
    /* eslint-enable */
}

/**
 * @description Api headers to send to TutorCruncher API
 */
export const apiHeaders = {
    Authorization: `token ${process.env.API_KEY}`
};

const baseUrl = "https://secure.tutorcruncher.com/api/";

export const isObject = (obj: any): boolean => typeof obj === "object" && !Array.isArray(obj) && obj !== null;

export const getValue = (target: any, path: string[]): any => {
    if (!target)
        return undefined;
    for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];

        if (!isObject(target))
            return undefined;
    }
    return target[path[path.length - 1]];
};

export const changeValue = (target: any, path: string[], value: any) => {
    for (let i = 0; i < path.length - 1; i++) {
        if (!isObject(target))
            break;
        if (!Object.keys(target).includes(path[i]))
            target[path[i]] = {};

        target = target[path[i]];
    }
    target[path[path.length - 1]] = value;
};

/**
 * @param path Route Path
 * @returns {string} full api request url
 * @description Takes route path, and appends it to end of base URL so you dont have to worry about it
 */
export const apiUrl = (path: string) => baseUrl + path.padStart(1, "/").substring(1);

/**
 * @param date
 * @returns If the given date is invalid
 */
export const invalidDate = (date: Date) => isNaN(date.getUTCMilliseconds());

export const readFile = (flName: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        fs.readFile(flName, (err, data) => {
            if(err){
                reject(err);
                return;
            }
            resolve(data);
        });
    });
};

export const writeFile = (flName: string, data: string | Buffer): Promise<null> => {
    return new Promise((resolve, reject) => {
        fs.writeFile(flName, data, (err) => {
            if(err){
                reject(err);
                return;
            }
            resolve(null);
        });
    });
};

export const stallFor = async (dur: Duration) => new Promise((resolve, _reject) => {
    setTimeout(resolve, dur.milliseconds);
});

export const getAttrByMachineName = (name: string, extra_attrs: {machine_name: string}[]): ExtraAttr | undefined => {
    const val: ExtraAttr | undefined = extra_attrs.filter(v => v.machine_name === name)[0] as ExtraAttr ?? undefined;
    if(typeof val?.value === "string")
        val.value = val.value.trim();
    return val;
};

/**
 * @param str string to capitalize
 * @returns string with first character upper case
 */
export const capitalize = (str: string): string => {
    if(str.length < 2)
        return str.toUpperCase();
    return str.charAt(0).toUpperCase()+str.substring(1).toLowerCase();
};

export const calcStripeFee = (lessonPrice: number): string => {
    return (((lessonPrice + 0.3)/0.961) - lessonPrice).toFixed(2);
};

export const days = (d: number): Duration => {
    return Duration.hour(d * 24);
};

export const randomChoice = <T>(arr: T[]): T => {
    return arr[Math.floor(Math.random()*arr.length)];
};

export const binarySearch = <T>(arr: T[], comp: (p: T)=>number): number => {
    if(arr.length === 0)
        return -1;
    let start = 0, end = arr.length - 1;
 
    // Iterate while start not meets end
    while (start <= end) {
 
        // Find the mid index
        const mid = Math.floor((start + end) / 2);
        const dir = comp(arr[mid]);
 
        // If element is present at
        // mid, return True
        if (dir === 0) return mid;
 
        // Else look in left or
        // right half accordingly
        else if (dir < 0)
            end = mid - 1;
        else
            start = mid + 1;
    }
 
    return end;

};
