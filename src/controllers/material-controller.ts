// controllers/material.controller.ts
import type { Request, Response } from "express";
import { MaterialService } from "../services/material-service";
import { ok, fail, HttpStatus } from "../utils/http";

type ReqUser = { _id: string; email: string; role: "admin" | "teacher" | "student" };
type AuthRequest = Request & { user?: ReqUser };

/** POST /materials */
export async function uploadMaterial(req: AuthRequest, res: Response) {
  try {
    const { classId, name, url, size } = req.body as {
      classId?: string; name?: string; url?: string; size?: string | number;
    };
    const doc = await MaterialService.upload({ classId, name, url, size, user: req.user });
    return ok(res, doc, HttpStatus.CREATED);
  } catch (e) {
    return fail(res, e, "Lỗi upload tài liệu");
  }
}

/** GET /materials/:classId */
export async function getMaterials(req: Request, res: Response) {
  try {
    const items = await MaterialService.listByClass(req.params.classId);
    return ok(res, items, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi lấy tài liệu");
  }
}

/** PUT /materials/:id  body { name } */
export async function updateMaterial(req: AuthRequest, res: Response) {
  try {
    const updated = await MaterialService.update({
      id: req.params.id,
      name: req.body?.name,
      user: req.user,
    });
    return ok(res, updated, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi cập nhật tài liệu");
  }
}

/** DELETE /materials/:id */
export async function deleteMaterial(req: AuthRequest, res: Response) {
  try {
    const result = await MaterialService.remove({ id: req.params.id, user: req.user });
    return ok(res, result, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi xóa tài liệu");
  }
}
