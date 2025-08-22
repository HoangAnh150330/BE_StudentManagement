// controllers/grade.controller.ts
import type { Request, Response } from "express";
import { GradeService } from "../services/grade-service";
import { ok, fail, HttpStatus, AppError } from "../utils/http";

/** POST /grades  { classId, type, items: [{studentId, score, note?}, ...] } */
export async function addGrade(req: Request, res: Response) {
  try {
    const { classId, type, items } = req.body ?? {};
    if (!classId || !type || !Array.isArray(items)) {
      throw new AppError("Thiếu classId/type/items", HttpStatus.BAD_REQUEST);
    }
    const result = await GradeService.addMany({ classId, type, items });
    return ok(res, result, HttpStatus.CREATED);
  } catch (e) {
    return fail(res, e, "Lỗi nhập điểm");
  }
}

/** PUT /grades/:id  { score?, note? } */
export async function updateGrade(req: Request, res: Response) {
  try {
    const updated = await GradeService.updateOne({
      id: req.params.id,
      score: req.body?.score,
      note: req.body?.note,
    });
    return ok(res, updated, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi chỉnh sửa điểm");
  }
}
