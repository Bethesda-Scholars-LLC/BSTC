import axios from "axios";
import { Duration } from "ts-duration";
import { Log, stallFor } from "./util";

const diff = Duration.second(1.2);
let lastReq = new Date(Date.now()- diff.milliseconds).getTime();
export const geocode = async (address: string): Promise<GeoResponse[]> => {
  try {
    while(lastReq > Date.now()-diff.milliseconds) {
      await stallFor(Duration.millisecond(lastReq-(Date.now()-diff.milliseconds)));
    }
    lastReq = Date.now();

    return (await axios(`https://geocode.maps.co/search?q=${encodeURIComponent(address)}&api_key=${process.env.GEOCODE_API_KEY}`)).data;
  }catch (e) {
    Log.error(e);
    return [];
  }
};


export type GeoResponse = {
  place_id: number,
  licence: string,
  powered_by: string,
  osm_type: string,
  osm_id: number,
  boudningbox: number[],
  lat: string,
  lon: string,
  display_name: string
  class: string,
  type: string,
  importance: number
}

const ZIPS: {min: number, max: number, code: string, long: string}[] = [
  {min: 35000, max:36999, code: "AL", long: "Alabama"},
  {min: 99500, max:99999, code: "AK", long: "Alaska"},
  {min: 85000, max:86999, code: "AZ", long: "Arizona"},
  {min: 71600, max:72999, code: "AR", long: "Arkansas"},
  {min: 90000, max:96699, code: "CA", long: "California"},
  {min: 80000, max:81999, code: "CO", long: "Colorado"},
  {min: 6000,  max:6999,  code: "CT", long: "Connecticut"},
  {min: 19700, max:19999, code: "DE", long: "Deleware"},
  {min: 32000, max:34999, code: "FL", long: "Florida"},
  {min: 30000, max:31999, code: "GA", long: "Georgia"},
  {min: 96700, max:96999, code: "HI", long: "Hawaii"},
  {min: 83200, max:83999, code: "ID", long: "Idaho"},
  {min: 60000, max:62999, code: "IL", long: "Illinois"},
  {min: 46000, max:47999, code: "IN", long: "Indiana"},
  {min: 50000, max:52999, code: "IA", long: "Iowa"},
  {min: 66000, max:67999, code: "KS", long: "Kansas"},
  {min: 40000, max:42999, code: "KY", long: "Kentucky"},
  {min: 70000, max:71599, code: "LA", long: "Louisiana"},
  {min: 3900,  max:4999,  code: "ME", long: "Maine"},
  {min: 20600, max:21999, code: "MD", long: "Maryland"},
  {min: 1000,  max:2799,  code: "MA", long: "Massachusetts"},
  {min: 48000, max:49999, code: "MI", long: "Michigan"},
  {min: 55000, max:56999, code: "MN", long: "Minnesota"},
  {min: 38600, max:39999, code: "MS", long: "Mississippi"},
  {min: 63000, max:65999, code: "MO", long: "Missouri"},
  {min: 59000, max:59999, code: "MT", long: "Montana"},
  {min: 27000, max:28999, code: "NC", long: "North Carolina"},
  {min: 58000, max:58999, code: "ND", long: "North Dakota"},
  {min: 68000, max:69999, code: "NE", long: "Nebraska"},
  {min: 88900, max:89999, code: "NV", long: "Nevada"},
  {min: 3000, max:3899, code: "NH", long: "New Hampshire"},
  {min: 7000, max:8999, code: "NJ", long: "New Jersey"},
  {min: 87000, max:88499, code: "NM", long: "New Mexico"},
  {min: 10000, max:14999, code: "NY", long: "New York"},
  {min: 43000, max:45999, code: "OH", long: "Ohio"},
  {min: 73000, max:74999, code: "OK", long: "Oklahoma"},
  {min: 97000, max:97999, code: "OR", long: "Oregon"},
  {min: 15000, max:19699, code: "PA", long: "Pennsylvania"},
  {min: 300, max:999, code: "PR", long: "Puerto Rico"},
  {min: 2800, max:2999, code: "RI", long: "Rhode Island"},
  {min: 29000, max:29999, code: "SC", long: "South Carolina"},
  {min: 57000, max:57999, code: "SD", long: "South Dakota"},
  {min: 37000, max:38599, code: "TN", long: "Tennessee"},
  {min: 75000, max:79999, code: "TX", long: "Texas"},
  {min: 88500, max:88599, code: "TX", long: "Texas"},
  {min: 84000, max:84999, code: "UT", long: "Utah"},
  {min: 5000, max:5999, code: "VT", long: "Vermont"},
  {min: 22000, max:24699, code: "VA", long: "Virgina"},
  {min: 20000, max:20599, code: "DC", long: "Washington DC"},
  {min: 98000, max:99499, code: "WA", long: "Washington"},
  {min: 24700, max:26999, code: "WV", long: "West Virginia"},
  {min: 53000, max:54999, code: "WI", long: "Wisconsin"},
  {min: 82000, max:83199, code: "WY", long: "Wyoming"}
];


// Returns false on invalid zip-- else returns {code:"XX" long:"XXXXXXXXX"}
export const getStateByZipCode = (zipcode: number): undefined | {code: string, long: string} =>  {
  if(isNaN(zipcode))
    return;

  // Code blocks alphabetized by state
  const state = ZIPS.filter((s) => s.min <= zipcode && s.max >= zipcode );

  if (state.length === 0){
      return;
  } else if (state.length > 1) {
      Log.debug("Found multiple states ??");
  }

  return {code:state[0].code, long:state[0].long};
};
