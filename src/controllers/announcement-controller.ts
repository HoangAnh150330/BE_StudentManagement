import type { Request, Response } from "express";
import { AnnouncementService } from "../services/announce-service";
import { ok, fail, HttpStatus } from "../utils/http";

type ReqUser = {
  _id: string;
  email: string;
  role: "admin" | "teacher" | "student";
};
type AuthRequest = Request & { user?: ReqUser };

export async function sendAnnouncement(req: AuthRequest, res: Response) {
  try {
    const { classId, title } = req.body as { classId?: string; title?: string };
    const doc = await AnnouncementService.send({
      classId: classId ?? "",
      title: title ?? "",
      user: req.user,
    });
    return ok(res, doc, HttpStatus.CREATED); // 201 Created
  } catch (e) {
    return fail(res, e, "Lỗi gửi thông báo");
  }
}

export async function getAnnouncements(req: Request, res: Response) {
  try {
    const items = await AnnouncementService.listByClass(req.params.classId);
    return ok(res, items);
  } catch (e) {
    return fail(res, e, "Lỗi lấy thông báo");
  }
}
