import { DumbJob, Location } from "../service/types";

export type LessonObject = {
    id: number
    start: string
    finish: string
    units: string
    topic: string
    location: Location
    rcras: {
        recipient: number
        recipient_name: string
        paying_client: number
        paying_client_name: string
        charge_rate: string
        status: string
    }[]
    cjas: {
        contractor: number
        contractor_name: string
        pay_rate: string
    }[]
    status: string
    repeater: {
        repeat: string
        every: number
        repeat_on: string
        stops_on: string
        stops_after: number
        source_apt: number
        service: any,
        charge_type: string
    } | null
    service: DumbJob
}

