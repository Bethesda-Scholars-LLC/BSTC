import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const requiredEnvs = ["API_KEY", "EMAIL_FROM", "EMAIL_ADDRESS", "EMAIL_PASSWORD"];
const envKeys = Object.keys(process.env);

if(requiredEnvs.reduce((prev, val) => {
        return prev || !envKeys.includes(val);
    }, false)
){
    const missingFields = requiredEnvs.filter(v => !envKeys.includes(v));
    if(missingFields.length === 1){
        console.log(missingFields[0]+" is required in the env and it is missing");
    } else {
        console.log(missingFields.reduce(
            (prev: string, v: string, i: number, arr: string[]) => prev+(i === arr.length-1 ? `and ${v}` : `${v}, `), ""
        )+" are required in the .env and they are missing");
    }
    process.exit(-1);
}

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

export const getAttrByMachineName = (name: string, extra_attrs: {machine_name: string}[]): any | undefined =>
    extra_attrs.filter(v => v.machine_name === name)[0];

export const capitalize = (str: string): string => {
    if(str.length < 2)
        return str.toUpperCase();
    return str.charAt(0).toUpperCase()+str.substring(1);
};
