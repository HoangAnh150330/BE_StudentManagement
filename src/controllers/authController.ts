import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/UserModels";
import PendingUser from "../models/PendingUser";
import { sendOTPEmail, generateOTP } from "../utils/otp";

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

const signToken = (payload: { id: string; role: string }) =>
  jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });

// ========== Auth & OTP ==========

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email đã tồn tại" });

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    await PendingUser.findOneAndUpdate(
      { email },
      {
        name,
        email,
        password: hashed,
        role: role || "student",
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Trả về ngay, email gửi nền
    res.status(200).json({ message: "Đăng ký bước 1 thành công. OTP đã gửi email." });
    sendOTPEmail(email, otp).catch((err) => console.error("Gửi OTP lỗi:", err));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Tài khoản đã xác minh" });

    const pending = await PendingUser.findOne({ email });
    if (!pending) return res.status(404).json({ message: "Không tìm thấy yêu cầu đăng ký đang chờ" });

    const otp = generateOTP();
    pending.otp = otp;
    pending.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save();

    await sendOTPEmail(email, otp);
    return res.json({ message: "OTP đã được gửi lại đến email" });
  } catch {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    const already = await User.findOne({ email });
    if (already) return res.status(400).json({ message: "Tài khoản đã xác minh" });

    const pending = await PendingUser.findOne({ email });
    if (!pending) return res.status(404).json({ message: "Không tìm thấy yêu cầu đăng ký đang chờ" });

    if (pending.otp !== otp || pending.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP không hợp lệ hoặc đã hết hạn" });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password, // đã hash sẵn
      role: pending.role,
    });

    await pending.deleteOne();

    return res.json({ message: "Xác minh OTP thành công, tài khoản đã được tạo", userId: user._id });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, (user.password as string) || ""))) {
      return res.status(400).json({ message: "Thông tin đăng nhập không hợp lệ" });
    }

    const token = signToken({ id: String(user._id), role: user.role as string });

    res.json({
      message: "Đăng nhập thành công",
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
    console.error("Lỗi đăng nhập:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const facebookLogin = async (req: Request, res: Response) => {
  try {
    const { facebookId, email, name } = req.body;
    if (!facebookId) return res.status(400).json({ message: "Yêu cầu Facebook ID" });

    let user = email
      ? await User.findOne({ $or: [{ facebookId }, { email }] })
      : await User.findOne({ facebookId });

    if (!user) {
      user = new User({ facebookId, email: email || "", name, role: "student" });
      await user.save();
    }

    const token = signToken({ id: String(user._id), role: user.role as string });

    return res.json({
      message: "Đăng nhập bằng Facebook thành công",
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
    console.error("Lỗi đăng nhập Facebook:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// ========== Change Password ==========
// PUT /students/:id/change-password  (hoặc /auth/change-password lấy id từ req.user)
export const changePassword = async (req: Request, res: Response) => {
  try {
    const paramId = req.params.id; // dùng param nếu có
    const authId = (req as any).user?.id as string | undefined; // nếu bạn gắn ở middleware
    const id = paramId || authId;

    const { currentPassword, newPassword } = req.body as ChangePasswordBody;
    if (!id) return res.status(400).json({ message: "Thiếu id người dùng." });
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Thiếu dữ liệu." });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "Mật khẩu mới không được trùng mật khẩu hiện tại." });
    }

    // enforce rule server-side
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
    if (!strong.test(newPassword)) {
      return res.status(400).json({ message: "Mật khẩu mới không đạt yêu cầu." });
    }

    const user = await User.findById(id).select("+password");
    if (!user || !user.password) return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const ok = await bcrypt.compare(currentPassword, user.password as string);
    if (!ok) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Đổi mật khẩu thành công." });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
