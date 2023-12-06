import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { SimpleChannel } from "channel-ts";
import { Duration } from "ts-duration";
import { Log, apiHeaders, apiUrl, stallFor } from "../util";

type TCApiReq = {
    chan: SimpleChannel<AxiosResponse<any, any> | null>,
    url: string,
    config?: AxiosRequestConfig,
}

//                num of reqs, num of seconds
const rateData = [20, 30];

class TCApiFetcher {
    /**
     * @description Array of timestamps at which we sent a request
     */
    private sentAt: number[];
    /**
     * @description Array of request objects to be sent
     */
    private toSend: TCApiReq[];
    /**
     * @description boolean to indicate wether or not we're currently listening for requests
     */
    private loopRunning: boolean;

    constructor() {
        this.sentAt = [];
        this.toSend = [];
        this.loopRunning = false;
    }

    /**
     * @param {string} url url to send request to
     * @param {AxiosRequestConfig} config axios configuration
     * @returns Response from api
     * @describe Queue request to be sent when ratelimit is up
     */
    async sendRequest(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<any, any> | null> {
        const rChan = new SimpleChannel<AxiosResponse<any, any> | null>();
        this.toSend.push({
            chan: rChan,
            url,
            config
        });
        return rChan.receive();
    }

    /**
     * @describe loop to process requests based on ratelimit status
     */
    async mainLoop() {
        if(this.loopRunning){
            return;
        }
        this.loopRunning = true;
        // infinite for loop
        for(;;){
            try {
                // if we have nothing to send, stall for 100ms
                if(this.toSend.length === 0) {
                    await stallFor(Duration.millisecond(100));
                    continue;
                }

                // purge older than a minute sentAt values
                for(;this.sentAt.length > 0 && this.sentAt[0] < Date.now() - (rateData[1]*1000);) {
                    this.sentAt.shift();
                }

                // we've sent too many requests recently
                if(this.sentAt.length >= rateData[0]) {
                    Log.debug("RATE LIMITED");
                    await stallFor(Duration.millisecond(100));
                    continue;
                }

                // sending a request, so add to sentAt
                this.sentAt.push(Date.now());
                const currReq = this.toSend.shift()!; // eslint-disable-line
                axios(
                    apiUrl(currReq.url), {
                    ...currReq.config,
                    headers: {
                        ...apiHeaders,
                        ...currReq.config?.headers,
                    }
                }).then(resp => {
                    currReq.chan.send(resp);
                }).catch(e => {
                    Log.error(e);
                    currReq.chan.send(null);
                });
            } catch(e) {
                Log.error(e);
            }
        }
    }

}

const apiFetcher = new TCApiFetcher();
apiFetcher.mainLoop();

namespace ApiFetcher {
    // just expose sendRequest function on apiFetcher
    export async function sendRequest(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<any, any> | null> {
        return apiFetcher.sendRequest(url, config);
    }
}

export default ApiFetcher;
