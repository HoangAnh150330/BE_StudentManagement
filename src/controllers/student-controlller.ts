// controllers/student.controller.ts
import type { Request, Response } from "express";
import { StudentService } from "../services/student-service";
import { ok, fail, HttpStatus } from "../utils/http";

type ReqUser = { _id?: string; role?: "admin" | "teacher" | "student" };
type AuthRequest = Request & { user?: ReqUser };

/** GET /api/admin/students */
export const getAllStudents = async (req: AuthRequest, res: Response) => {
  try {
    const students = await StudentService.listStudents(req.user, /* requireAdmin */ false);
    return ok(res, students, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};

/** GET /api/admin/students/:id */
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await StudentService.getProfile(req.params.id, req.user, /* requireAdmin */ false);
    return ok(res, user, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};

/** PATCH /api/admin/students/:id */
export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, gender, dob, province, avatar } = req.body || {};
    const data = await StudentService.updateStudent(
      req.params.id,
      { name, phone, gender, dob, province, avatar },
      req.user,
      /* requireAdmin */ false
    );
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Server error");
  }
};

/** DELETE /api/admin/students/:id */
export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const data = await StudentService.deleteStudent(req.params.id, req.user, /* requireAdmin */ false);
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};

/** POST /api/admin/students/:id/avatar */
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    const avatarUrl = file ? `/uploads/${file.filename}` : undefined;
    const data = await StudentService.setAvatar(req.params.id, avatarUrl, req.user, /* requireAdmin */ false);
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};
