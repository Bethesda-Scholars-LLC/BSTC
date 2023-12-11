import axios from "axios";
import { Log } from "./util";

export const geocode = async (address: string): Promise<GeoResponse[]> => {
  try {
    return (await axios(`https://geocode.maps.co/search?q=${encodeURIComponent(address)}`)).data;
  }catch (e) {
    Log.error((e as any).data);
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
