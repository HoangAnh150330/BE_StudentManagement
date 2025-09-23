import { Schema, model, Types } from "mongoose";

type Slot = { day: string; slot: string };

const SlotSchema = new Schema<Slot>(
  { day: { type: String, required: true }, slot: { type: String, required: true } },
  { _id: false }
);

const ChangeRequestSchema = new Schema(
  {
    classId:   { type: Types.ObjectId, ref: "Class", required: true },
    teacherId: { type: Types.ObjectId, ref: "User",  required: true },
    oldSlots:  { type: [SlotSchema], default: [] },
    newSlots:  { type: [SlotSchema], default: [] },
    reason:    { type: String, default: "" },
    status:    { type: String, enum: ["pending","approved","rejected","cancelled"], default: "pending" },
    reviewedBy:{ type: Types.ObjectId, ref: "User" },
    reviewedAt:{ type: Date },
    note:      { type: String },
  },
  { timestamps: true }
);

export default model("ChangeRequest", ChangeRequestSchema);
