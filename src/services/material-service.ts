// services/material-service.ts
import { Types } from "mongoose";
import MaterialModel from "../models/MaterialModels"; // đổi đúng tên file thật nếu khác
import { AppError, HttpStatus } from "../utils/http";

type Role = "admin" | "teacher" | "student";
type User = { _id: string; email?: string; role: Role };

const toOid = (id?: string, field = "id") => {
  if (!id) throw new AppError(`Thiếu ${field}`, HttpStatus.BAD_REQUEST);
  if (!Types.ObjectId.isValid(id)) throw new AppError(`${field} không hợp lệ`, HttpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

export const MaterialService = {
  async upload(params: {
    classId?: string;
    name?: string;
    url?: string;
    size?: string | number;
    user?: User;
  }) {
    const { classId, name, url, size, user } = params;
    if (!classId || !name || !url) throw new AppError("Thiếu dữ liệu", HttpStatus.BAD_REQUEST);
    if (!user?._id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);

    const doc = await MaterialModel.create({
      classId: toOid(classId, "classId"),
      name: String(name).trim(),
      url: String(url).trim(),
      size: typeof size === "number" ? String(size) : (size ?? ""),
      uploaderId: toOid(user._id, "uploaderId"),
    });

    return doc.toJSON?.() ?? doc;
  },

  async listByClass(classId?: string) {
    const oid = toOid(classId, "classId");
    const items = await MaterialModel.find({ classId: oid })
      .sort({ createdAt: -1 })
      .lean();
    return items;
  },

  async update(params: { id?: string; name?: string; user?: User }) {
    const { id, name, user } = params;
    const oid = toOid(id, "materialId");
    if (!user?._id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);
    if (!name?.trim()) throw new AppError("Thiếu tên tài liệu", HttpStatus.BAD_REQUEST);

    // chỉ admin hoặc chính uploader được sửa
    const mat = await MaterialModel.findById(oid).select("_id uploaderId");
    if (!mat) throw new AppError("Không tìm thấy tài liệu", HttpStatus.NOT_FOUND);

    const isOwner = String(mat.uploaderId) === String(user._id);
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new AppError("Không có quyền cập nhật tài liệu", HttpStatus.FORBIDDEN);
    }

    const updated = await MaterialModel.findByIdAndUpdate(
      oid,
      { $set: { name: name.trim() } },
      { new: true }
    ).lean();

    if (!updated) throw new AppError("Không tìm thấy tài liệu", HttpStatus.NOT_FOUND);
    return updated;
  },

  async remove(params: { id?: string; user?: User }) {
    const { id, user } = params;
    const oid = toOid(id, "materialId");
    if (!user?._id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);

    // chỉ admin hoặc chính uploader được xoá
    const mat = await MaterialModel.findById(oid).select("_id uploaderId");
    if (!mat) throw new AppError("Không tìm thấy tài liệu", HttpStatus.NOT_FOUND);

    const isOwner = String(mat.uploaderId) === String(user._id);
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new AppError("Không có quyền xóa tài liệu", HttpStatus.FORBIDDEN);
    }

    await MaterialModel.findByIdAndDelete(oid);
    return { message: "Đã xoá tài liệu." };
  },
};
