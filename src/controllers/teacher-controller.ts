// controllers/teacher.controller.ts
import type { Request, Response } from "express";
import { TeacherDashboardService } from "../services/teacher-service";
import { ok, fail, HttpStatus } from "../utils/http";

type ReqUser = { _id: string; email?: string; role: "admin" | "teacher" | "student" };
type AuthRequest = Request & { user?: ReqUser };

/** GET /teacher-dashboard/classes/me */
export const getMyClasses = async (req: AuthRequest, res: Response) => {
  try {
    const data = await TeacherDashboardService.getMyClasses(req.user);
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi lấy danh sách lớp");
  }
};

/** POST /teacher-dashboard/attendance
 * Body:
 *  - Chuẩn: { classId, date, records: [{studentId, status, note?}] }
 *  - Đơn lẻ: { classId, studentId, date, status, note? }
 */
export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const result = await TeacherDashboardService.markAttendance(req.body);
    return ok(res, result, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi điểm danh");
  }
};

/** POST /teacher-dashboard/grades
 * Body:
 *  - Theo đợt: { classId, type, items: [{studentId, score, note?}] }
 *  - Đơn lẻ: { classId, studentId, type, score, note? }
 */
export const addGrade = async (req: AuthRequest, res: Response) => {
  try {
    const result = await TeacherDashboardService.addGrade(req.body);
    return ok(res, result, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi nhập điểm");
  }
};

// (nếu bạn export default file này ở nơi khác)
// export default { getMyClasses, markAttendance, addGrade };
