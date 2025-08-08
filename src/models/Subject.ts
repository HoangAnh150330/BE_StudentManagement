import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISubject extends Document {
  name: string;
  code: string;
  credit: number;
  description: string;
  startDate: Date;
  endDate: Date;
  classes?: Types.ObjectId[]; 
}

const SubjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    credit: { type: Number, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }], 
  },
  { timestamps: true }
);

export default mongoose.model<ISubject>("Subject", SubjectSchema);
