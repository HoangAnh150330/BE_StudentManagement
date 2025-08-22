import mongoose from "mongoose";

const gradeSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["quiz", "midterm", "final"], required: true },
  score: { type: Number, required: true },
  note: String
}, { timestamps: true });

export default mongoose.model("Grade", gradeSchema);
