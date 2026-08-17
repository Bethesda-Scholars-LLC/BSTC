import { Schema, model, Types } from "mongoose";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

export interface IClientAwaiting {
    _id: Types.ObjectId
    client_id: number
    client_name?: string
    job_id: number
    tutor_ids: number[]
    tutor_names?: string[]
    createdAt: Date
}

export const popTutorFromCA = <T>(cAwaiting: T, tId: number): T => {
    (cAwaiting as any).tutor_ids = (cAwaiting as any).tutor_ids.filter((v: any) => v !== tId);
    return cAwaiting;
};

const clientAwaitingSchema = new Schema<IClientAwaiting>({
    client_id: {
        type: Number,
        required: true
    },
    client_name: {
        type: String,
        required: false
    },
    job_id: {
        type: Number,
        required: true
    },
    tutor_ids: {
        type: [Number],
        required: true
    },
    tutor_names: {
        type: [String],
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: ONE_WEEK_SECONDS
      }
});

const AwaitingClient = model("client_awaiting", clientAwaitingSchema);
export default AwaitingClient;


