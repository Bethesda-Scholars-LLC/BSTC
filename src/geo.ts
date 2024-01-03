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
