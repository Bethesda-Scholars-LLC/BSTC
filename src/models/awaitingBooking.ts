import { Schema, model, Types } from "mongoose";

export interface IAwaitingBooking {
    _id: Types.ObjectId,
    client_id: number,
    client_name: string
}

const awaitingBooking = new Schema<IAwaitingBooking>({
    client_id: {
        type: Number,
        required: true
    },
    client_name: {
        type: String,
        required: true
    }
});

const AwaitingClient = model("awaiting_booking", awaitingBooking);
export default AwaitingClient;