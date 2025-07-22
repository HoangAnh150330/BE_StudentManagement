import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendOTPEmail = async (to: string, otp: string) => {
  const mailOptions = {
    from: `"Student Management" <${process.env.MAIL_USER}>`,
    to,
    subject: 'Your OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 10px; border: 1px solid #ccc;">
        <h2>🔐 Xác minh OTP</h2>
        <p>Xin chào,</p>
        <p>Mã OTP của bạn là: <strong style="color: #2d79f3; font-size: 20px;">${otp}</strong></p>
        <p>Vui lòng nhập mã này để tiếp tục đăng ký hoặc đăng nhập.</p>
        <p><i>Mã có hiệu lực trong vòng 5 phút.</i></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(` OTP email sent to ${to}`);
  } catch (error) {
    console.error(' Error sending email:', error);
    throw new Error('Email sending failed');
  }
};
