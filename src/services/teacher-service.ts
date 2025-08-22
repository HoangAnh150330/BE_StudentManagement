// services/teacher-service.ts
import { Types } from "mongoose";
import ClassModel from "../models/Class";
import { AttendanceService } from "./attendance-service";
import { GradeService } from "./grade-service";
import { AppError, HttpStatus } from "../utils/http";

type Role = "admin" | "teacher" | "student";
type User = { _id?: string; role?: Role };

const toOid = (id?: string, field = "id") => {
  if (!id) throw new AppError(`Thiếu ${field}`, HttpStatus.BAD_REQUEST);
  if (!Types.ObjectId.isValid(id)) throw new AppError(`${field} không hợp lệ`, HttpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

const needAuth = (user?: User) => {
  const id = user?._id;
  if (!id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);
  return id;
};

// (tuỳ chính sách) — nếu bạn muốn chỉ giáo viên mới được thao tác dashboard:
const ensureTeacher = (user?: User) => {
  if (!user?._id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);
  if (user.role !== "teacher" && user.role !== "admin") {
    throw new AppError("Forbidden", HttpStatus.FORBIDDEN);
  }
};

export const TeacherDashboardService = {
  async getMyClasses(user?: User) {
    ensureTeacher(user);
    const teacherId = needAuth(user);
    const docs = await ClassModel.find({ teacherId: toOid(String(teacherId), "teacherId") }).lean();
    return docs;
  },

  /** Điểm danh:
   * - Batch chuẩn: { classId, date, records: [...] } → forward AttendanceService.markAttendance
   * - Đơn lẻ: { classId, studentId, date, status, note? } → gói lại thành records[1] để dùng cùng validate
   */
  async markAttendance(payload: any) {
    // Bắt buộc có classId & date
    const classId = payload?.classId as string | undefined;
    const date = payload?.date as string | undefined;
    if (!classId || !date) {
      throw new AppError("Thiếu classId/date", HttpStatus.BAD_REQUEST);
    }

    // Dạng batch
    if (Array.isArray(payload?.records)) {
      const { records } = payload as {
        records: Array<{ studentId: string; status: "present" | "absent" | "late"; note?: string }>;
      };
      return AttendanceService.markAttendance({ classId, date, records });
    }

    // Dạng đơn lẻ → gói lại thành batch 1 phần tử (tận dụng validate/idempotent)
    const one = {
      studentId: payload?.studentId as string | undefined,
      status: payload?.status as "present" | "absent" | "late" | undefined,
      note: payload?.note as string | undefined,
    };
    if (!one.studentId || !one.status) {
      throw new AppError("Thiếu studentId/status", HttpStatus.BAD_REQUEST);
    }

    return AttendanceService.markAttendance({
      classId,
      date,
      records: [one as { studentId: string; status: "present" | "absent" | "late"; note?: string }],
    });
  },

  /** Nhập điểm:
   * - Batch: { classId, type, items: [...] } → forward GradeService.addMany
   * - Đơn lẻ: { classId, studentId, type, score, note? } → gói lại thành items[1]
   */
  async addGrade(payload: any) {
    const classId = payload?.classId as string | undefined;
    const type = payload?.type as string | undefined;
    if (!classId || !type) {
      throw new AppError("Thiếu classId/type", HttpStatus.BAD_REQUEST);
    }

    // Dạng batch
    if (Array.isArray(payload?.items)) {
      return GradeService.addMany({ classId, type, items: payload.items });
    }

    // Dạng đơn lẻ → gói lại để dùng cùng validate/thang điểm
    const one = {
      studentId: payload?.studentId as string | undefined,
      score: payload?.score as number | undefined,
      note: payload?.note as string | undefined,
    };
    if (!one.studentId || typeof one.score !== "number") {
      throw new AppError("Thiếu studentId/score", HttpStatus.BAD_REQUEST);
    }

    return GradeService.addMany({
      classId,
      type,
      items: [one as { studentId: string; score: number; note?: string }],
    });
  },
};
