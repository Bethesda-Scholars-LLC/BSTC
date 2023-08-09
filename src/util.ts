import dotenv from "dotenv";
import fs from "fs";
import { ExtraAttr } from "./types";
dotenv.config();

/**
 * @description required fields in the .env
 */
const requiredEnvs = [
    "API_KEY",
    "PERSONAL_EMAIL_FROM",
    "PERSONAL_EMAIL_ADDRESS",
    "BUSINESS_EMAIL_ADDRESS",
    "BUSINESS_EMAIL_FROM",
    "EMAIL_PASSWORD",
    "SIGNATURE_DESCRIPTION",
    "DB_URI",
    "DB_TEST_NAME",
    "DB_NAME"
];

const envKeys = Object.keys(process.env);
export const PROD = ["production", "prod"].includes(process.env.NODE_ENV?.toLowerCase() ?? ""); // eslint-disable-line

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

export const DB_URI = process.env.DB_URI! + (PROD ? process.env.DB_NAME! : process.env.DB_TEST_NAME); // eslint-disable-line

/**
 * @description Api headers to send to TutorCruncher API
 */
export const apiHeaders = {
    Authorization: `token ${process.env.API_KEY}`
};

const baseUrl = "https://secure.tutorcruncher.com/api/";

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

export const stallFor = async (ms: number) => new Promise((resolve, _reject) => {
    setTimeout(resolve, ms);
});

export const getAttrByMachineName = (name: string, extra_attrs: {machine_name: string}[]): ExtraAttr | undefined =>
    extra_attrs.filter(v => v.machine_name === name)[0] as ExtraAttr ?? undefined;

/**
 * @param str string to capitalize
 * @returns string with first character upper case
 */
export const capitalize = (str: string): string => {
    if(str.length < 2)
        return str.toUpperCase();
    return str.charAt(0).toUpperCase()+str.substring(1);
};

export const calcStripeFee = (lessonPrice: number): string => {
    return (((lessonPrice + 0.3)/0.961) - lessonPrice).toFixed(2);
};

export const randomChoice = <T>(arr: T[]): T => {
    return arr[Math.floor(Math.random()*arr.length)];
};

export namespace Log {
    /* eslint-disable no-console */
    export const error = (message?: any, ...optionalParams: any[]) => {
        console.error(message, ...optionalParams);
    };

    export const debug = (message?: any, ...optionalParams: any[]) => {
        if(!PROD)
            console.debug(message, ...optionalParams);
    };
    /* eslint-enable */
}
