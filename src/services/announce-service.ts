import { Types } from "mongoose";
import AnnouncementModel from "../models/AnnouncementModels";
import ClassModel from "../models/Class";
import { AppError, HttpStatus } from "../utils/http";

const toOid = (id?: string) => {
  if (!id) throw new AppError("Thiếu classId", HttpStatus.BAD_REQUEST);
  if (!Types.ObjectId.isValid(id))
    throw new AppError("classId không hợp lệ", HttpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

type User = { _id: string; role: "admin" | "teacher" | "student" };

export const AnnouncementService = {
  async send(params: { classId: string; title: string; user?: User }) {
    const { classId, title, user } = params;

    if (!title?.trim())
      throw new AppError("Thiếu dữ liệu (title)", HttpStatus.BAD_REQUEST);
    if (!user?._id)
      throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);

    const classOid = toOid(classId);

    // Chỉ admin hoặc giáo viên phụ trách lớp
    const cls = await ClassModel.findById(classOid).select("_id teacherId");
    if (!cls) throw new AppError("Lớp không tồn tại", HttpStatus.NOT_FOUND);

    const isAdmin = user.role === "admin";
    const isOwnerTeacher = String(cls.teacherId) === String(user._id);
    if (!isAdmin && !isOwnerTeacher) {
      throw new AppError(
        "Không có quyền gửi thông báo cho lớp này",
        HttpStatus.FORBIDDEN
      );
    }

    // Tạo thông báo
    const doc = await AnnouncementModel.create({
      classId: classOid,
      title: title.trim(),
      creatorId: user._id,
    });

    return doc;
  },

  async listByClass(classId?: string) {
    const oid = toOid(classId);
    return AnnouncementModel.find({ classId: oid }).sort({ createdAt: -1 });
  },
};
