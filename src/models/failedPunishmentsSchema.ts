import BigNumber from "bignumber.js";
import { Document, model, Schema } from "mongoose";
import BigNumberSchema from "mongoose-bignumber";

export interface IPunishment extends Document {
    server: string;
    id: string;
    type: "ban" | "mute" | "unban" | "unmute";
    duration?: BigNumber;
    reason?: string;
}

export const failedPunishmentsSchema = new Schema({
    server: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["ban", "mute", "unban", "unmute"],
    },
    duration: {
        type: BigNumberSchema,
    },
    reason: {
        type: String,
    },
});

export default model<IPunishment>("FailedPunishment", failedPunishmentsSchema);
