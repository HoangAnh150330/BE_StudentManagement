import { Request, Response } from 'express';
import User, { IUser } from '../models/UserModels';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOTPEmail, generateOTP } from '../utils/otp';
import { v2 as cloudinary } from 'cloudinary';
import { unlink } from 'fs/promises';
import multer from 'multer';
import path from 'path';

// Cấu hình multer để lưu tạm ảnh trước khi tải lên Cloudinary
const storage = multer.diskStorage({
  destination: './uploads/temp/',
  filename: (req, file, cb) => {
    cb(null, `${req.params.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Chỉ hỗ trợ định dạng .png, .jpg và .jpeg!'));
  }
});


export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email đã tồn tại' });

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
    res.status(201).json({ message: 'Đăng ký thành công. OTP đã được gửi đến email.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendOTPEmail(email, otp);
  res.json({ message: 'OTP đã được gửi lại đến email' });
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.otp !== otp || user.otpExpires! < new Date()) {
    return res.status(400).json({ message: 'OTP không hợp lệ hoặc đã hết hạn' });
  }

  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ message: 'Xác minh OTP thành công' });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password as string))) {
    return res.status(400).json({ message: "Thông tin đăng nhập không hợp lệ" });
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
      avatar: user.avatar
    },
  });
};

export const facebookLogin = async (req: Request, res: Response) => {
  try {
    const { facebookId, email, name } = req.body;

    if (!facebookId) {
      return res.status(400).json({ message: "Yêu cầu Facebook ID" });
    }

    let user = null;

    if (email) {
      user = await User.findOne({
        $or: [{ facebookId }, { email }]
      });
    } else {
      user = await User.findOne({ facebookId });
    }

    if (!user) {
      user = new User({
        facebookId,
        email: email || "",
        name,
        role: "student"
      });
      await user.save();
    }

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
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error("Lỗi đăng nhập Facebook:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export const getAllStudents = async (req: Request, res: Response) => {
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

    const student = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.json({ message: "Update successful", student });
  } catch (err) {
    console.error("Error updating student:", err);
    return res.status(500).json({ message: "Server error", error: err });
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
    console.error("Lỗi server:", err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      if (req.file) await unlink(req.file.path);
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được tải lên' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'avatars',
      public_id: `avatar_${userId}_${Date.now()}`,
      transformation: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    if (user.avatar) {
      const publicId = user.avatar.split('/').pop()?.split('.')[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`avatars/${publicId}`);
      }
    }

    user.avatar = result.secure_url;
    await user.save();
    await unlink(req.file.path);

    res.json({
      message: 'Tải ảnh avatar thành công',
      avatar: result.secure_url
    });
  } catch (err) {
    console.error('Lỗi tải avatar:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
