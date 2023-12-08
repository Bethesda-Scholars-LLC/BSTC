import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { SimpleChannel } from "channel-ts";
import { Duration } from "ts-duration";
import { Log, PROD, apiHeaders, apiUrl, stallFor } from "../util";

type TCApiReq = {
    chan: SimpleChannel<AxiosResponse<any, any> | [any]>,
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
    /**
     * @description set to true to kill mainloop
     */
    private dead: boolean;

    constructor() {
        this.sentAt = [];
        this.toSend = [];
        this.loopRunning = false;
        this.dead = false;
    }

    /**
     * @param {string} url url to send request to
     * @param {AxiosRequestConfig} config axios configuration
     * @returns Response from api
     * @describe Queue request to be sent when ratelimit is up
     */
    async sendRequest(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<any, any>> {
        const rChan = new SimpleChannel<AxiosResponse<any, any> | [any]>();
        this.toSend.push({
            chan: rChan,
            url,
            config
        });
        const response = await rChan.receive();
        if(Array.isArray(response))
            throw response[0];
        
        return response;
    }

    kill() {
        this.dead = true;
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
        let firstRate = true;
        for(;!this.dead;){
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
                    if(firstRate){
                        Log.debug("RATE LIMITED");
                        firstRate = false;
                    }
                    await stallFor(Duration.millisecond(100));
                    continue;
                }
                firstRate = true;

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
                    currReq.chan.send([e]);
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
    export async function sendRequest(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<any, any>> {
        return apiFetcher.sendRequest(url, config);
    }
    export async function kill() {
        if(!PROD)
            apiFetcher.kill();
    }

}

export default ApiFetcher;
