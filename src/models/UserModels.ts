import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  phone: String,
  dob: String,
  gender: String,
  province: String,
  otp: String,
  otpExpires: Date
});

export default mongoose.model('User', userSchema);
