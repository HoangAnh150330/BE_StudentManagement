import mongoose, { Schema, Document } from "mongoose";

export interface IClass extends Document {
  name: string;
  course: string;
  teacher: string;
}

const ClassSchema = new Schema<IClass>(
  {
    name: { type: String, required: true },
    course: { type: String, required: true },
    teacher: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IClass>("Class", ClassSchema);