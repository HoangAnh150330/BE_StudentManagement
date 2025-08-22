// controllers/subject.controller.ts
import type { Request, Response } from "express";
import { SubjectService } from "../services/subject-service";
import { ok, fail, HttpStatus } from "../utils/http";

/** GET /subjects */
export const getAllSubjects = async (_req: Request, res: Response) => {
  try {
    const subjects = await SubjectService.getAll();
    return ok(res, subjects, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi máy chủ");
  }
};

/** POST /subjects */
export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, code, credit, description, startDate, endDate } = req.body ?? {};
    const created = await SubjectService.create({ name, code, credit, description, startDate, endDate });
    return ok(res, created, HttpStatus.CREATED);
  } catch (e) {
    return fail(res, e, "Không thể tạo môn học");
  }
};

/** PUT /subjects/:id */
export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { name, code, credit, description, startDate, endDate } = req.body ?? {};
    const updated = await SubjectService.update(req.params.id, { name, code, credit, description, startDate, endDate });
    return ok(res, updated, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Không thể cập nhật môn học");
  }
};

/** DELETE /subjects/:id */
export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const result = await SubjectService.remove(req.params.id);
    return ok(res, result, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi khi xóa môn học");
  }
};
