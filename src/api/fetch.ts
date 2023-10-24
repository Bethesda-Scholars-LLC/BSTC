import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { SimpleChannel } from "channel-ts";
import { Log, apiHeaders, apiUrl, stallFor } from "../util";

type TCApiReq = {
    chan: SimpleChannel<AxiosResponse<any, any> | null>,
    url: string,
    config?: AxiosRequestConfig,
}

//                num of reqs, num of seconds
const rateData = [50, 30];

class TCApiFetcher {
    private sentAt: number[];
    /**
     * @description Array of request objects to be sent
     */
    private toSend: TCApiReq[];
    private loopRunning: boolean;

    constructor() {
        this.sentAt = [];
        this.toSend = [];
        this.loopRunning = false;
    }

    public async sendRequest(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<any, any> | null> {
        const rChan = new SimpleChannel<AxiosResponse<any, any> | null>();
        this.toSend.push({
            chan: rChan,
            url,
            config
        });
        return rChan.receive();
    }

    async mainLoop() {
        return;
        if(this.loopRunning){
            Log.debug("DONT CALL MAINLOOP ON API FETCHER");
            return;
        }
        this.loopRunning = true;
        // infinite for loop
        let sent = 0;
        for(;;){
            try {
                const now = Date.now();
                // if we have nothing to send, stall for 500ms
                if(this.toSend.length === 0) {
                    await stallFor(500);
                    continue;
                }

                // purge older than a minute sentAt values
                for(;this.sentAt.length > 0 && this.sentAt[0] < now - (rateData[1]*1000);) {
                    this.sentAt.shift();
                }

                // we've sent too many requests recently
                if(this.sentAt.length >= rateData[0]) {
                    Log.debug("RATE LIMITED");
                    await stallFor(500);
                    continue;
                }

                Log.debug("Sent in the last minute: " + this.sentAt.length);
                Log.debug("To send length: " + this.toSend.length);
                Log.debug("Already sent: " + sent);
                Log.debug("----------------");
                sent++;
                this.sentAt.push(Date.now());
                const currReq = this.toSend.shift()!; // eslint-disable-line
                try {
                    const resp = await axios(
                        apiUrl(currReq.url), {
                        ...currReq.config,
                        headers: {
                            ...apiHeaders,
                            ...currReq.config?.headers,
                        }
                    });
                    currReq.chan.send(resp);
                } catch(e) {
                    Log.error(e);
                    currReq.chan.send(null);
                    break;
                }
            } catch(e) {
                Log.error(e);
            }
        }
    }

}
const apiFetcher = new TCApiFetcher();
//apiFetcher.mainLoop();

export default apiFetcher;
