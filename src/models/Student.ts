import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  userId: mongoose.Types.ObjectId;
  classId?: mongoose.Types.ObjectId;
}

const studentSchema = new Schema<IStudent>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  classId: { type: Schema.Types.ObjectId, ref: 'Class' }
}, { timestamps: true });

export default mongoose.model<IStudent>('Student', studentSchema);
