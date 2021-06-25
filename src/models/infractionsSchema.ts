import { Document, model, Schema } from "mongoose";

export interface IInfractions extends Document {
    id: string;
    infractions: number;
    words: string[][];
}

export const infractionsSchema = new Schema({
    id: {
        type: String,
        required: true,
    },
    infractions: {
        type: Number,
        required: true,
        min: 0,
    },
    words: [
        [
            {
                type: String,
                required: true,
            },
        ],
    ],
});

export default model<IInfractions>("Infraction", infractionsSchema);
