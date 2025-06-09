import { Schema, model } from "mongoose";


export interface IScreening {
    tutor_id: number,
    status: string,
    screener_id: number,
    screener_name: string,
    date: Date,
}

const screeningSchema = new Schema<IScreening>({
    tutor_id: {
        type: Number,
        required: true,
        index: true,
    },
    status: {
        type: String,
        required: true,
    },
    screener_id: {
        type: Number,
        required: true,
        index: true
    },
    screener_name: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
    },
});

const ScreeningModel = model("screenings", screeningSchema);

export default ScreeningModel;
