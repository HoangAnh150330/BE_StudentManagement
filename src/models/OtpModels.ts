import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: String,
  expiresAt: Date,
});

export default mongoose.model('OTP', otpSchema);
