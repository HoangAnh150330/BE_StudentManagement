// services/student-service.ts
import { Types } from "mongoose";
import User from "../models/UserModels";
import { AppError, HttpStatus } from "../utils/http";

const toOid = (id?: string, field = "id") => {
  if (!id) throw new AppError(`Thiếu ${field}`, HttpStatus.BAD_REQUEST);
  if (!Types.ObjectId.isValid(id)) throw new AppError(`${field} không hợp lệ`, HttpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

const HIDDEN = "-password -otp -otpExpires";

type Role = "admin" | "teacher" | "student";
type UserCtx = { _id?: string; role?: Role };

// Nếu muốn bắt buộc admin cho các API dưới, đặt requireAdmin = true khi gọi.
const ensureAdmin = (user?: UserCtx, requireAdmin?: boolean) => {
  if (requireAdmin && user?.role !== "admin") {
    throw new AppError("Forbidden", HttpStatus.FORBIDDEN);
  }
};

export const StudentService = {
  async listStudents(_user?: UserCtx, requireAdmin = false) {
    ensureAdmin(_user, requireAdmin);
    return User.find({ role: "student" }).select(HIDDEN).lean();
  },

  async getProfile(id?: string, _user?: UserCtx, requireAdmin = false) {
    ensureAdmin(_user, requireAdmin);
    const oid = toOid(id, "id");
    const doc = await User.findById(oid).select(HIDDEN).lean();
    if (!doc) throw new AppError("Không tìm thấy người dùng", HttpStatus.NOT_FOUND);
    return doc;
  },

  async updateStudent(
    id: string | undefined,
    payload: {
      name?: string;
      phone?: string;
      gender?: string;
      dob?: string | Date;
      province?: string;
      avatar?: string;
    },
    _user?: UserCtx,
    requireAdmin = false
  ) {
    ensureAdmin(_user, requireAdmin);
    const oid = toOid(id, "id");

    // Chỉ update các field được phép
    const updateData: Record<string, unknown> = {};
    if (typeof payload.name !== "undefined") updateData.name = payload.name;
    if (typeof payload.phone !== "undefined") updateData.phone = payload.phone;
    if (typeof payload.gender !== "undefined") updateData.gender = payload.gender;
    if (typeof payload.dob !== "undefined") updateData.dob = payload.dob;
    if (typeof payload.province !== "undefined") updateData.province = payload.province;
    if (typeof payload.avatar !== "undefined") updateData.avatar = payload.avatar;

    if (Object.keys(updateData).length === 0) {
      throw new AppError("Không có trường nào để cập nhật", HttpStatus.BAD_REQUEST);
    }

    const doc = await User.findByIdAndUpdate(oid, updateData, { new: true }).select(HIDDEN).lean();
    if (!doc) throw new AppError("Student not found", HttpStatus.NOT_FOUND);
    return { message: "Update successful", student: doc };
  },

  async deleteStudent(id?: string, _user?: UserCtx, requireAdmin = false) {
    ensureAdmin(_user, requireAdmin);
    const oid = toOid(id, "id");
    const deleted = await User.findOneAndDelete({ _id: oid, role: "student" });
    if (!deleted) throw new AppError("Không tìm thấy học sinh", HttpStatus.NOT_FOUND);
    return { message: "Xóa học sinh thành công" };
  },

  async setAvatar(id?: string, avatarUrl?: string, _user?: UserCtx, requireAdmin = false) {
    ensureAdmin(_user, requireAdmin);
    if (!avatarUrl) throw new AppError("Không có file", HttpStatus.BAD_REQUEST);
    const oid = toOid(id, "id");
    const user = await User.findByIdAndUpdate(oid, { avatar: avatarUrl }, { new: true })
      .select(HIDDEN)
      .lean();
    if (!user) throw new AppError("Không tìm thấy người dùng", HttpStatus.NOT_FOUND);
    return { message: "Tải avatar thành công", avatar: avatarUrl, user };
  },
};
