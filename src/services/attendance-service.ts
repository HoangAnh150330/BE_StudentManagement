// services/attendance-service.ts
import { Types } from "mongoose";
import AttendanceModel from "../models/AttendanceModels"; // hoặc ../models/AttendanceModel
import { AppError, HttpStatus } from "../utils/http";

type MarkRecord = { studentId: string; status: "present" | "absent" | "late"; note?: string };

const toOid = (id?: string, field = "id") => {
  if (!id) throw new AppError(`Thiếu ${field}`, HttpStatus.BAD_REQUEST);
  if (!Types.ObjectId.isValid(id)) throw new AppError(`${field} không hợp lệ`, HttpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

const normalizeDateUTC = (iso?: string) => {
  if (!iso) throw new AppError("Thiếu date", HttpStatus.BAD_REQUEST);
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new AppError("date không hợp lệ", HttpStatus.BAD_REQUEST);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const AttendanceService = {
  /** Idempotent upsert theo (classId, studentId, date) */
  async markAttendance(params: { classId: string; date: string; records: MarkRecord[] }) {
    const { classId, date, records } = params;

    if (!Array.isArray(records)) {
      throw new AppError("records phải là mảng", HttpStatus.BAD_REQUEST);
    }

    const classOid = toOid(classId, "classId");
    const d = normalizeDateUTC(date);

    const ops =
      records.map((r) => {
        const studentOid = toOid(r.studentId, "studentId");
        if (!["present", "absent", "late"].includes(r.status)) {
          throw new AppError("status không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        return {
          updateOne: {
            filter: { classId: classOid, studentId: studentOid, date: d },
            update: { $set: { status: r.status, note: r.note ?? "" } },
            upsert: true,
          },
        };
      }) ?? [];

    if (ops.length === 0) {
      return { upserted: 0, modified: 0, matched: 0 };
    }

    const result = await AttendanceModel.bulkWrite(ops, { ordered: false });
    return {
      upserted: (result as any).upsertedCount ?? 0,
      modified: (result as any).modifiedCount ?? 0,
      matched: (result as any).matchedCount ?? 0,
    };
  },

  async updateAttendance(params: { id: string; status?: "present" | "absent" | "late"; note?: string }) {
    const { id, status, note } = params;
    const oid = toOid(id, "attendanceId");

    const $set: Record<string, any> = {};
    if (typeof status !== "undefined") {
      if (!["present", "absent", "late"].includes(status)) {
        throw new AppError("status không hợp lệ", HttpStatus.BAD_REQUEST);
      }
      $set.status = status;
    }
    if (typeof note !== "undefined") $set.note = note;

    if (Object.keys($set).length === 0) {
      throw new AppError("Không có trường nào để cập nhật", HttpStatus.BAD_REQUEST);
    }

    const updated = await AttendanceModel.findByIdAndUpdate(oid, { $set }, { new: true }).lean();
    if (!updated) throw new AppError("Không tìm thấy bản ghi điểm danh", HttpStatus.NOT_FOUND);
    return updated;
  },

  async getByDate(params: { classId: string; date: string }) {
    const { classId, date } = params;
    const classOid = toOid(classId, "classId");
    const d = normalizeDateUTC(date);

    const list = await AttendanceModel.find({ classId: classOid, date: d })
      .select("_id studentId status note")
      .lean();

    return list.map((r: any) => ({
      id: String(r._id),
      studentId: String(r.studentId),
      status: r.status,
      note: r.note ?? "",
    }));
  },
};
