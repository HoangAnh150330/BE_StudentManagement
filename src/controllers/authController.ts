import { Request, Response } from 'express';
import User from '../models/UserModels';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOTPEmail, generateOTP } from '../utils/otp';
import PendingUser from '../models/PendingUser';

// ========== Auth & OTP ==========

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email đã tồn tại' });

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    await PendingUser.findOneAndUpdate(
      { email },
      {
        name,
        email,
        password: hashed,
        role: role || 'student',
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Đăng ký bước 1 thành công. OTP đã gửi email.' });

    // gửi OTP không chặn response
    sendOTPEmail(email, otp).catch(err => {
      console.error('Gửi OTP lỗi:', err);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Tài khoản đã xác minh' });

    const pending = await PendingUser.findOne({ email });
    if (!pending) return res.status(404).json({ message: 'Không tìm thấy yêu cầu đăng ký đang chờ' });

    const otp = generateOTP();
    pending.otp = otp;
    pending.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save();

    await sendOTPEmail(email, otp);
    return res.json({ message: 'OTP đã được gửi lại đến email' });
  } catch {
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const already = await User.findOne({ email });
    if (already) return res.status(400).json({ message: 'Tài khoản đã xác minh' });

    const pending = await PendingUser.findOne({ email });
    if (!pending) return res.status(404).json({ message: 'Không tìm thấy yêu cầu đăng ký đang chờ' });

    if (pending.otp !== otp || pending.otpExpires < new Date()) {
      return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password, // đã hash sẵn
      role: pending.role,
    });

    await pending.deleteOne();

    return res.json({ message: 'Xác minh OTP thành công, tài khoản đã được tạo', userId: user._id });
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password as string))) {
      return res.status(400).json({ message: 'Thông tin đăng nhập không hợp lệ' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' } // tuỳ chỉnh
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const facebookLogin = async (req: Request, res: Response) => {
  try {
    const { facebookId, email, name } = req.body;

    if (!facebookId) {
      return res.status(400).json({ message: 'Yêu cầu Facebook ID' });
    }

    let user = null;

    if (email) {
      user = await User.findOne({ $or: [{ facebookId }, { email }] });
    } else {
      user = await User.findOne({ facebookId });
    }

    if (!user) {
      user = new User({
        facebookId,
        email: email || '',
        name,
        role: 'student',
      });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Đăng nhập bằng Facebook thành công',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Lỗi đăng nhập Facebook:', error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

// ========== Students & Profile ==========

export const getAllStudents = async (_req: Request, res: Response) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password -otp -otpExpires');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const student = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.json({ message: 'Update successful', student });
  } catch (err) {
    console.error('Error updating student:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await User.findOneAndDelete({ _id: id, role: 'student' });

    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy học sinh' });

    res.json({ message: 'Xóa học sinh thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password -otp -otpExpires');
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    res.json(user);
  } catch (err) {
    console.error('Lỗi server:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
