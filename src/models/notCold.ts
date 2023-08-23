import { Schema, model, Types } from "mongoose";

export interface INotCold {
    _id: Types.ObjectId
    client_id: number
    client_name: string
    job_id: number
    tutor_id: number
    tutor_name: string
}

const notColdSchema = new Schema<INotCold>({
    client_id: {
        type: Number,
        required: true
    },
    client_name: {
        type: String,
        required: true
    },
    job_id: {
        type: Number,
        required: true
    },
    tutor_id: {
        type: Number,
        required: true
    },
    tutor_name: {
        type: String,
        required: true
    }
});

const NotCold = model("not_cold", notColdSchema);
export default NotCold;


