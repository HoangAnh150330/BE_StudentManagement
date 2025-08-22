// models/Class.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITimeSlot {
  day: string;
  slot: string;
}

export interface IClass extends Document {
  name: string;
  subject: string;
  teacherId: Types.ObjectId;     // ref User
  maxStudents: number;
  timeSlots: ITimeSlot[];
  teacherName?: string;
}

const TimeSlotSchema = new Schema<ITimeSlot>({
  day: { type: String, required: true },
  slot: { type: String, required: true },
});

const ClassSchema = new Schema<IClass>(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    maxStudents: { type: Number, required: true, min: 1 },
    timeSlots: { type: [TimeSlotSchema], required: true },
  },
  { timestamps: true }
);

ClassSchema.virtual("teacherName").get(function (this: any) {
  const t = this.teacherId;
  if (t && typeof t === "object" && "name" in t) {
    return (t as { name?: string }).name;
  }
  return undefined;
});

// Xuất JSON có kèm virtuals
ClassSchema.set("toJSON", {
  virtuals: true,
});

export default mongoose.model<IClass>("Class", ClassSchema);
