import { Schema, model, Types } from "mongoose";

export interface IClientAwaiting {
    _id: Types.ObjectId
    client_id: number
    job_id: number
    tutor_ids: number[]
}

export const popTutorFromCA = (cAwaiting: any, tId: number): any => {
    cAwaiting.tutor_ids = (cAwaiting as any).tutor_ids.filter((v: any) => v !== tId);
    return cAwaiting;
};

const clientAwaitingSchema = new Schema<IClientAwaiting>({
    client_id: {
        type: Number,
        required: true
    },
    job_id: {
        type: Number,
        required: true
    },
    tutor_ids: {
        type: [Number],
        required: true
    }
});

const AwaitingClient = model("client_awaiting", clientAwaitingSchema);
export default AwaitingClient;


