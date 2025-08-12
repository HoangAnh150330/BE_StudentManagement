import mongoose, { Schema, Document, Types } from "mongoose";

export interface IEnrollment extends Document {
  student: Types.ObjectId;
  class: Types.ObjectId;
  status: "approved" | "pending" | "rejected";
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    class: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    status: { type: String, enum: ["approved", "pending", "rejected"], default: "approved" },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ student: 1, class: 1 }, { unique: true });

export default mongoose.model<IEnrollment>("Enrollment", EnrollmentSchema);
