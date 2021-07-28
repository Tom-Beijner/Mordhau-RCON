import { Document, model, Schema } from "mongoose";

export interface IWarns extends Document {
    id: string;
    infractions: number;
}

export const warnsSchema = new Schema({
    id: {
        type: String,
        required: true,
    },
    infractions: {
        type: Number,
        required: true,
        min: 0,
    },
    expirationDate: {
        type: Date,
        expires: 0,
    },
});

export default model<IWarns>("Warns", warnsSchema);
