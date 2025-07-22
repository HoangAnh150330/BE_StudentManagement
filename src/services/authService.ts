import OTPModel from '../models/OtpModels';
import { generateOTP } from '../utils/otp';
import { sendOTPEmail } from '../utils/mailer';

export const sendOTPToEmail = async (email: string) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

  await OTPModel.create({ email, otp, expiresAt });

  const subject = 'Your OTP Code';
  const html = `<h3>Your OTP Code: <strong>${otp}</strong></h3><p>It expires in 5 minutes.</p>`;

  await sendOTPEmail(email, subject);

  return {
    status: 200,
    data: { message: 'OTP sent to email' },
  };
};
