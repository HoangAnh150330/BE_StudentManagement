import { Request, Response } from 'express';
import User from '../models/UserModels';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOTPEmail, generateOTP } from '../utils/otp';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const newUser = new User({
      name,
      email,
      password: hashed,
      role,
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000)
    });

    await newUser.save();
    await sendOTPEmail(email, otp);
    console.log("OTP:",otp);
    res.status(201).json({ message: 'Registered. OTP sent to email.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: 'User not found' });

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendOTPEmail(email, otp);
  res.json({ message: 'OTP resent to email' });
};


export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.otp !== otp || user.otpExpires! < new Date()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ message: 'OTP verified' });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password as string))) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET!
  );

  res.json({
    message: "Đăng nhập thành công",
    token,
    user: {
      _id: user._id,
      name: user.name, 
      email: user.email,
      role: user.role,
    },
  });
};
// đăng nhập fb
export const facebookLogin = async (req: Request, res: Response) => {
  try {
    const { facebookId, email, name } = req.body;

    if (!facebookId) {
      return res.status(400).json({ message: "Facebook ID is required" });
    }

    let user = null;

    // Tìm user theo facebookId hoặc email
    if (email) {
      user = await User.findOne({
        $or: [{ facebookId }, { email }]
      });
    } else {
      user = await User.findOne({ facebookId });
    }

    // Nếu chưa tồn tại → tạo mới
    if (!user) {
      user = new User({
        facebookId,
        email: email || "",
        name,
        role: "student" // Hoặc "user" tùy hệ thống
      });
      await user.save();
    }

    // Tạo token đăng nhập
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Đăng nhập bằng Facebook thành công",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Facebook login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Lấy tất cả học sinh
export const getAllStudents = async (req: Request, res: Response) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password -otp -otpExpires');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
//Cập nhật 
export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const student = await User.findOneAndUpdate(
      { _id: id, role: 'student' },
      updatedData,
      { new: true }
    );

    if (!student) return res.status(404).json({ message: 'Student not found' });

    res.json({ message: 'Student updated', student });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
//Xóa
export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await User.findOneAndDelete({ _id: id, role: 'student' });

    if (!deleted) return res.status(404).json({ message: 'Student not found' });

    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
//lấy thoog tin theo id
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id; // ✅ lấy từ URL

    const user = await User.findById(userId).select('-password -otp -otpExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

