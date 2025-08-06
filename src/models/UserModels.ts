import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  facebookId:string;
  role: 'admin' | 'student';
  phone: string;
  dob: string;
  gender: string;
  province: string;
  otp?: string;
  otpExpires?: Date;
}

const userSchema = new Schema<IUser>({
  name: String,
  email: { type: String, unique: true },
  password: String,
  facebookId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  phone: String,
  dob: String,
  gender: String,
  province: String,
  otp: String,
  otpExpires: Date
}, { timestamps: true });

export default mongoose.model<IUser>('User', userSchema);