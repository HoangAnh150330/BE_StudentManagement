// controllers/enrollment.controller.ts
import type { Request, Response } from "express";
import { EnrollmentService } from "../services/enrollment-service";
import { ok, fail, HttpStatus, AppError } from "../utils/http";

type AuthReq = Request & { user?: { id?: string; role?: string } };

/** POST /enroll/:classId  hoặc body { classId } */
export const enrollClass = async (req: AuthReq, res: Response) => {
  try {
    const classId = req.params.classId || (req.body as any)?.classId;
    const data = await EnrollmentService.enroll({ classId, user: req.user });
    return ok(res, data, HttpStatus.CREATED);
  } catch (e: any) {
    // Trùng unique index { student, class }
    if (e?.code === 11000) {
      return fail(res, new AppError("Bạn đã đăng ký lớp này", HttpStatus.CONFLICT));
    }
    return fail(res, e, "Lỗi hệ thống");
  }
};

/** DELETE /enroll/:classId  hoặc body { classId } */
export const cancelEnrollment = async (req: AuthReq, res: Response) => {
  try {
    const classId = req.params.classId || (req.body as any)?.classId;
    const data = await EnrollmentService.cancel({ classId, user: req.user });
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi hệ thống");
  }
};

/** GET /students/:id/schedule */
export const getStudentSchedule = async (req: AuthReq, res: Response) => {
  try {
    const data = await EnrollmentService.getStudentSchedule(req.params.id);
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi hệ thống");
  }
};
