// controllers/avatar.controller.ts
import type { Request, Response } from "express";
import { AvatarService } from "../services/avatar-service";
import { safeUnlink } from "../utils/image";
import { ok, fail, HttpStatus } from "../utils/http";

export const uploadAvatar = async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  const tempPath = file?.path;

  try {
    const userId = req.params.id;

    const data = await AvatarService.setFromLocalFile({
      userId,
      localPath: tempPath,
      mimetype: file?.mimetype,
      size: file?.size,
    });

    // Trả về thống nhất: { success: true, data: {...} }
    return ok(res, { message: "Tải ảnh avatar thành công", ...data }, HttpStatus.OK);
  } catch (e) {
    console.error("Lỗi upload avatar:", e);
    return fail(res, e, "Lỗi server");
  } finally {
    // Luôn dọn file tạm
    await safeUnlink(tempPath);
  }
};
