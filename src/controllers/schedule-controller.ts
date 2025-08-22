// controllers/schedule.controller.ts
import type { Request, Response } from "express";
import { ScheduleService } from "../services/schedule-service";
import { ok, fail, HttpStatus } from "../utils/http";

type ReqUser = { _id: string; email: string; role: "admin" | "teacher" | "student" };
type AuthRequest = Request & { user?: ReqUser };

/** GET /teaching-schedule (toàn hệ thống) */
export const getTeachingSchedule = async (_req: Request, res: Response) => {
  try {
    const data = await ScheduleService.getTeachingSchedule();
    return ok(res, data, HttpStatus.OK);
  } catch (error) {
    return fail(res, error, "Lỗi khi lấy lịch giảng dạy");
  }
};

/** GET /schedule/me (theo giáo viên đang đăng nhập) */
export const getSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const data = await ScheduleService.getScheduleForTeacher(req.user);
    return ok(res, data, HttpStatus.OK);
  } catch (error) {
    return fail(res, error, "Lỗi lấy lịch dạy");
  }
};

/** PUT /classes/:id/schedule (cập nhật lịch dạy) */
export const updateSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const updated = await ScheduleService.updateSchedule({
      classId: req.params.id,
      schedule: req.body?.schedule,
      user: req.user,
    });
    return ok(res, updated, HttpStatus.OK);
  } catch (error) {
    return fail(res, error, "Lỗi cập nhật lịch dạy");
  }
};

export default getTeachingSchedule;
