
import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingUser extends Document {
  name?: string;
  email: string;
  password: string;        
  role: 'admin' | 'student';
  otp: string;
  otpExpires: Date;
}

const pendingUserSchema = new Schema<IPendingUser>({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  otp: String,
  otpExpires: Date,
}, { timestamps: true });


pendingUserSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IPendingUser>('PendingUser', pendingUserSchema);
