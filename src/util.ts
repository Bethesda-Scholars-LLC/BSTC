import dotenv from "dotenv";
dotenv.config();

if(!process.env.API_KEY){
    console.log("Please add 'API_KEY' to .env");
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

