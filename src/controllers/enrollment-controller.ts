// controllers/enrollment.controller.ts
import type { Request, Response } from "express";
import { EnrollmentService } from "../services/enrollment-service";
import { ok, fail, HttpStatus, AppError } from "../utils/http";

type AuthReq = Request & { user?: { _id?: string; role?: string } };  // Thay id bằng _id

export const enrollClass = async (req: AuthReq, res: Response) => {
  try {
    const classId = req.params.classId || (req.body as any)?.classId;
    if (!req.user || !req.user._id) {  // Dùng _id thay vì id
      return fail(res, new AppError("Thông tin người dùng không hợp lệ", HttpStatus.UNAUTHORIZED));
    }
    const data = await EnrollmentService.enroll({ classId, user: req.user });
    return ok(res, data, HttpStatus.CREATED);
  } catch (e: any) {
    console.error("Enroll error details:", e);  // Thêm log để debug
    if (e?.code === 11000) {
      return fail(res, new AppError("Bạn đã đăng ký lớp này", HttpStatus.CONFLICT));
    }
    return fail(res, e, "Lỗi hệ thống");
  }
};

/** DELETE /enroll/:classId  hoặc body { classId } */
// controllers/enrollment-controller.ts
export const cancelEnrollment = async (req: AuthReq, res: Response) => {
  try {
    const classId = req.params.classId;
    if (!req.user || !req.user._id) {
      return fail(res, new AppError("Thông tin người dùng không hợp lệ", HttpStatus.UNAUTHORIZED));
    }
    const data = await EnrollmentService.cancel({ classId, user: req.user });
    return ok(res, data, HttpStatus.OK);
  } catch (e: any) {
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
