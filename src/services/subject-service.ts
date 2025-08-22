// services/subject-service.ts
import { Types } from "mongoose";
import Subject from "../models/Subject";
import { AppError, HttpStatus } from "../utils/http";

const toOid = (id?: string, field = "id") => {
  if (!id) throw new AppError(`Thiếu ${field}`, HttpStatus.BAD_REQUEST);
  if (!Types.ObjectId.isValid(id)) throw new AppError(`${field} không hợp lệ`, HttpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

export const SubjectService = {
  async getAll() {
    return Subject.find().sort({ createdAt: -1 }).lean();
  },

  async create(params: {
    name?: string;
    code?: string;
    credit?: number;
    description?: string;
    startDate?: string | Date;
    endDate?: string | Date;
  }) {
    const { name, code, credit, description, startDate, endDate } = params;

    if (!name || !code || typeof credit !== "number" || !startDate || !endDate) {
      throw new AppError("Vui lòng nhập đầy đủ thông tin", HttpStatus.BAD_REQUEST);
    }

    // endDate phải >= startDate (nếu cùng định dạng chuyển về Date để so sánh)
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      throw new AppError("Ngày bắt đầu/kết thúc không hợp lệ", HttpStatus.BAD_REQUEST);
    }
    if (e < s) throw new AppError("endDate phải sau hoặc bằng startDate", HttpStatus.BAD_REQUEST);

    const exists = await Subject.findOne({ code }).select("_id");
    if (exists) throw new AppError("Mã môn học đã tồn tại", HttpStatus.CONFLICT);

    const doc = await Subject.create({ name, code, credit, description, startDate: s, endDate: e });
    return doc.toJSON?.() ?? doc;
  },

  async update(
    id?: string,
    payload?: {
      name?: string;
      code?: string;
      credit?: number;
      description?: string;
      startDate?: string | Date;
      endDate?: string | Date;
    }
  ) {
    const oid = toOid(id, "id");
    const { name, code, credit, description, startDate, endDate } = payload || {};

    // Nếu đổi code → check trùng với môn khác
    if (code) {
      const dup = await Subject.findOne({ code, _id: { $ne: oid } }).select("_id");
      if (dup) throw new AppError("Mã môn học đã tồn tại", HttpStatus.CONFLICT);
    }

    const updateData: Record<string, unknown> = {};
    if (typeof name !== "undefined") updateData.name = name;
    if (typeof code !== "undefined") updateData.code = code;
    if (typeof credit !== "undefined") updateData.credit = credit;
    if (typeof description !== "undefined") updateData.description = description;

    // validate và set ngày nếu có
    if (typeof startDate !== "undefined") {
      const s = new Date(startDate);
      if (Number.isNaN(s.getTime())) throw new AppError("startDate không hợp lệ", HttpStatus.BAD_REQUEST);
      updateData.startDate = s;
    }
    if (typeof endDate !== "undefined") {
      const e = new Date(endDate);
      if (Number.isNaN(e.getTime())) throw new AppError("endDate không hợp lệ", HttpStatus.BAD_REQUEST);
      updateData.endDate = e;
    }
    // Nếu cả 2 có mặt, đảm bảo e>=s
    if ("startDate" in updateData && "endDate" in updateData) {
      if ((updateData.endDate as Date) < (updateData.startDate as Date)) {
        throw new AppError("endDate phải sau hoặc bằng startDate", HttpStatus.BAD_REQUEST);
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError("Không có trường nào để cập nhật", HttpStatus.BAD_REQUEST);
    }

    const updated = await Subject.findByIdAndUpdate(oid, updateData, { new: true }).lean();
    if (!updated) throw new AppError("Không tìm thấy môn học", HttpStatus.NOT_FOUND);
    return updated;
  },

  async remove(id?: string) {
    const oid = toOid(id, "id");
    const deleted = await Subject.findByIdAndDelete(oid);
    if (!deleted) throw new AppError("Không tìm thấy môn học", HttpStatus.NOT_FOUND);
    return { message: "Đã xóa môn học" };
  },
};
