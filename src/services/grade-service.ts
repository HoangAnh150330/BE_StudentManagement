// services/grade-service.ts
import { Types } from "mongoose";
import GradeModel from "../models/GradeModels";
import { AppError, HttpStatus } from "../utils/http";

type GradeType = "quiz" | "midterm" | "final" | string;

const toOid = (id?: string, field = "id") => {
  if (!id) throw new AppError(`Thiếu ${field}`, HttpStatus.BAD_REQUEST);
  if (!Types.ObjectId.isValid(id)) throw new AppError(`${field} không hợp lệ`, HttpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

const isNumber = (v: any) => typeof v === "number" && Number.isFinite(v);
// Có thể cấu hình qua ENV, mặc định 0..10
const MIN_SCORE = Number(process.env.GRADE_MIN ?? 0);
const MAX_SCORE = Number(process.env.GRADE_MAX ?? 10);

export const GradeService = {
  /**
   * Thêm/cập nhật nhiều điểm cho 1 lớp theo dạng idempotent:
   * - Mỗi (classId, studentId, type) sẽ được upsert (tạo mới nếu chưa có, cập nhật nếu đã tồn tại)
   */
  async addMany(params: {
    classId?: string;
    type?: GradeType;
    items?: Array<{ studentId: string; score: number; note?: string }>;
  }) {
    const { classId, type, items } = params;

    if (!classId || !type || !Array.isArray(items)) {
      throw new AppError("Thiếu dữ liệu", HttpStatus.BAD_REQUEST);
    }
    if (items.length === 0) return { upserted: 0, modified: 0, matched: 0 };

    const classOid = toOid(classId, "classId");

    const ops = items.map((it, idx) => {
      const studentOid = toOid(it.studentId, `items[${idx}].studentId`);
      if (!isNumber(it.score)) {
        throw new AppError(`items[${idx}].score phải là number`, HttpStatus.BAD_REQUEST);
      }
      if (it.score < MIN_SCORE || it.score > MAX_SCORE) {
        throw new AppError(
          `items[${idx}].score phải trong khoảng ${MIN_SCORE}..${MAX_SCORE}`,
          HttpStatus.BAD_REQUEST
        );
      }
      return {
        updateOne: {
          filter: { classId: classOid, studentId: studentOid, type },
          update: { $set: { score: it.score, note: it.note ?? "" } },
          upsert: true,
        },
      };
    });

    const result = await (GradeModel as any).bulkWrite(ops, { ordered: false });
    return {
      upserted: result.upsertedCount ?? 0,
      modified: result.modifiedCount ?? 0,
      matched: result.matchedCount ?? 0,
    };
  },

  async updateOne(params: { id?: string; score?: number; note?: string }) {
    const { id, score, note } = params;
    const oid = toOid(id, "gradeId");

    const $set: Record<string, any> = {};
    if (typeof score !== "undefined") {
      if (!isNumber(score)) throw new AppError("score phải là number", HttpStatus.BAD_REQUEST);
      if (score < MIN_SCORE || score > MAX_SCORE) {
        throw new AppError(`score phải trong khoảng ${MIN_SCORE}..${MAX_SCORE}`, HttpStatus.BAD_REQUEST);
      }
      $set.score = score;
    }
    if (typeof note !== "undefined") $set.note = note;

    if (Object.keys($set).length === 0) {
      throw new AppError("Không có trường nào để cập nhật", HttpStatus.BAD_REQUEST);
    }

    const updated = await GradeModel.findByIdAndUpdate(oid, { $set }, { new: true }).lean();
    if (!updated) throw new AppError("Không tìm thấy bản điểm để cập nhật", HttpStatus.NOT_FOUND);
    return updated;
  },
};
