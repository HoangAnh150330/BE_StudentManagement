// controllers/attendance.controller.ts
import type { Request, Response } from "express";
import { AttendanceService } from "../services/attendance-service";
import { ok, fail, AppError, HttpStatus } from "../utils/http";

/** POST /teacher/attendance */
export async function markAttendance(req: Request, res: Response) {
  try {
    const { classId, date, records } = req.body as {
      classId: string;
      date: string;
      records: Array<{ studentId: string; status: "present" | "absent" | "late"; note?: string }>;
    };

    if (!classId || !date || !Array.isArray(records)) {
      throw new AppError("Thiếu classId/date/records", HttpStatus.BAD_REQUEST);
    }

    const result = await AttendanceService.markAttendance({ classId, date, records });
    return ok(res, result, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi ghi nhận điểm danh");
  }
}

/** PUT /teacher/attendance/:id */
export async function updateAttendance(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const { status, note } = req.body ?? {};

    const updated = await AttendanceService.updateAttendance({ id, status, note });
    return ok(res, updated, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi chỉnh sửa điểm danh");
  }
}

/** GET /teacher/attendance?classId=...&date=... */
export async function getAttendanceByDate(req: Request, res: Response) {
  try {
    const classId = String(req.query.classId || "");
    const date = String(req.query.date || "");

    if (!classId || !date) {
      throw new AppError("Thiếu classId hoặc date", HttpStatus.BAD_REQUEST);
    }

    const data = await AttendanceService.getByDate({ classId, date });
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi tải điểm danh");
  }
}
