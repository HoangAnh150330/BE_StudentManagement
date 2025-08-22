// services/auth-service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/UserModels";
import PendingUser from "../models/PendingUser";
import { sendOTPEmail, generateOTP } from "../utils/otp";
import { AppError, HttpStatus } from "../utils/http";

type Role = "admin" | "teacher" | "student";
type JwtPayload = { id: string; role: Role };

const JWT_SECRET = process.env.JWT_SECRET || "";

// Ký token (throw nếu thiếu SECRET khi hàm được gọi)
const signToken = (payload: JwtPayload) => {
  if (!JWT_SECRET) throw new AppError("JWT_SECRET chưa cấu hình", HttpStatus.INTERNAL);
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

export const AuthService = {
  /** Đăng ký bước 1: lưu PendingUser + gửi OTP */
  async register(params: { name: string; email: string; password: string; role?: Role }) {
    const { name, email, password, role } = params;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError("Email đã tồn tại", HttpStatus.CONFLICT);

    if (!PWD_REGEX.test(password)) {
      throw new AppError("Mật khẩu không đạt yêu cầu.", HttpStatus.BAD_REQUEST);
    }

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

    await PendingUser.findOneAndUpdate(
      { email },
      { name, email, password: hashed, role: role || "student", otp, otpExpires },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // gửi email nền
    sendOTPEmail(email, otp).catch((err) => console.error("Gửi OTP lỗi:", err));
    return { message: "Đăng ký bước 1 thành công. OTP đã gửi email." };
  },

  /** Gửi lại OTP */
  async resendOTP(params: { email: string }) {
    const { email } = params;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new AppError("Tài khoản đã xác minh", HttpStatus.BAD_REQUEST);

    const pending = await PendingUser.findOne({ email });
    if (!pending) throw new AppError("Không tìm thấy yêu cầu đăng ký đang chờ", HttpStatus.NOT_FOUND);

    const otp = generateOTP();
    pending.otp = otp;
    pending.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await pending.save();

    await sendOTPEmail(email, otp);
    return { message: "OTP đã được gửi lại đến email" };
  },

  /** Xác minh OTP và tạo tài khoản chính thức */
  async verifyOTP(params: { email: string; otp: string }) {
    const { email, otp } = params;

    const already = await User.findOne({ email });
    if (already) throw new AppError("Tài khoản đã xác minh", HttpStatus.BAD_REQUEST);

    const pending = await PendingUser.findOne({ email });
    if (!pending) throw new AppError("Không tìm thấy yêu cầu đăng ký đang chờ", HttpStatus.NOT_FOUND);

    if (pending.otp !== otp || (pending.otpExpires && pending.otpExpires < new Date())) {
      throw new AppError("OTP không hợp lệ hoặc đã hết hạn", HttpStatus.BAD_REQUEST);
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password, // đã hash sẵn
      role: pending.role,
    });

    await pending.deleteOne();

    return { message: "Xác minh OTP thành công, tài khoản đã được tạo", userId: user._id };
  },

  /** Đăng nhập email/password */
  async login(params: { email: string; password: string }) {
    const { email, password } = params;

    const user = await User.findOne({ email }).select("+password");
    const ok = user && user.password && (await bcrypt.compare(password, user.password as string));
    if (!ok) throw new AppError("Thông tin đăng nhập không hợp lệ", HttpStatus.UNAUTHORIZED);

    const token = signToken({ id: String(user._id), role: user.role as Role });

    return {
      message: "Đăng nhập thành công",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  },

  /** Đăng nhập bằng Facebook (tối giản) */
  async facebookLogin(params: { facebookId?: string; email?: string; name?: string }) {
    const { facebookId, email, name } = params;
    if (!facebookId) throw new AppError("Yêu cầu Facebook ID", HttpStatus.BAD_REQUEST);

    let user = email
      ? await User.findOne({ $or: [{ facebookId }, { email }] })
      : await User.findOne({ facebookId });

    if (!user) {
      user = new User({ facebookId, email: email || "", name, role: "student" });
      await user.save();
    }

    const token = signToken({ id: String(user._id), role: user.role as Role });

    return {
      message: "Đăng nhập bằng Facebook thành công",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    };
  },

  /** Đổi mật khẩu */
  async changePassword(params: {
    targetUserId?: string; // từ params
    authUserId?: string;   // từ req.user
    currentPassword: string;
    newPassword: string;
  }) {
    const { targetUserId, authUserId, currentPassword, newPassword } = params;
    const id = targetUserId || authUserId;

    if (!id) throw new AppError("Thiếu id người dùng.", HttpStatus.BAD_REQUEST);
    if (!currentPassword || !newPassword) throw new AppError("Thiếu dữ liệu.", HttpStatus.BAD_REQUEST);
    if (currentPassword === newPassword) {
      throw new AppError("Mật khẩu mới không được trùng mật khẩu hiện tại.", HttpStatus.BAD_REQUEST);
    }
    if (!PWD_REGEX.test(newPassword)) {
      throw new AppError("Mật khẩu mới không đạt yêu cầu.", HttpStatus.BAD_REQUEST);
    }

    const user = await User.findById(id).select("+password");
    if (!user || !user.password) throw new AppError("Không tìm thấy người dùng.", HttpStatus.NOT_FOUND);

    const match = await bcrypt.compare(currentPassword, user.password as string);
    if (!match) throw new AppError("Mật khẩu hiện tại không đúng.", HttpStatus.UNAUTHORIZED);

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return { message: "Đổi mật khẩu thành công." };
  },
};
