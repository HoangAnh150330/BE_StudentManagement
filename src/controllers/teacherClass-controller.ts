// controllers/teacherClass.controller.ts
import type { Request, Response } from "express";
import { TeacherClassService } from "../services/teacherClass-service";
import { ok, fail, HttpStatus } from "../utils/http";

type ReqUser = { _id?: string; id?: string; email?: string; role?: "admin" | "teacher" | "student" };
type AuthRequest = Request & { user?: ReqUser };

/** Lấy danh sách lớp của GV đăng nhập */
export async function getMyClasses(req: AuthRequest, res: Response) {
  try {
    const data = await TeacherClassService.getMyClasses(req.user);
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi lấy danh sách lớp");
  }
}

/** Học viên trong lớp */
export async function getClassStudents(req: Request, res: Response) {
  try {
    const data = await TeacherClassService.getClassStudents(req.params.id);
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi lấy danh sách học viên");
  }
}

/** Tải CSV danh sách học viên */
export async function downloadClassStudents(req: Request, res: Response) {
  try {
    const { filename, csv } = await TeacherClassService.getClassStudentsCSV(req.params.id);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (e) {
    return fail(res, e, "Lỗi xuất CSV học viên");
  }
}

/** (Tuỳ chọn) Lịch dạy giáo viên */
export async function getTeacherSchedule(req: AuthRequest, res: Response) {
  try {
    const data = await TeacherClassService.getTeacherSchedule(req.user);
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi lấy lịch dạy");
  }
}

export default getMyClasses;
