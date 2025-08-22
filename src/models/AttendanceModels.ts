// models/AttendanceModels.ts
import { Schema, model, Types } from "mongoose";

const AttendanceSchema = new Schema(
  {
    classId:   { type: Types.ObjectId, ref: "Class", required: true, index: true },
    studentId: { type: Types.ObjectId, ref: "User",  required: true, index: true },
    date:      { type: Date, required: true, index: true }, // luôn lưu 00:00 UTC
    status:    { type: String, enum: ["present", "absent", "late"], default: "present" },
    note:      { type: String },
  },
  { timestamps: true }
);

// 1 SV / 1 lớp / 1 ngày chỉ có 1 record
AttendanceSchema.index({ classId: 1, studentId: 1, date: 1 }, { unique: true });

export default model("Attendance", AttendanceSchema);
