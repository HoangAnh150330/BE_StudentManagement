import mongoose, { Schema, Document } from "mongoose";

export interface ISubject extends Document {
  name: string;
  code: string;
  credit: number;
}

const SubjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    credit: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISubject>("Subject", SubjectSchema);
