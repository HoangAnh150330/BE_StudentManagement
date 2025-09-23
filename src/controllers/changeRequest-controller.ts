import type { Request, Response } from "express";
import { ok, fail, HttpStatus } from "../utils/http";
import { ChangeRequestService } from "../services/changeRequest-service";

type ReqUser = { _id: string; role: "admin" | "teacher" | "student" };
type AuthRequest = Request & { user?: ReqUser };

export const ChangeRequestController = {
  async create(req: AuthRequest, res: Response) {
    try {
      const payload = {
        classId: req.body?.classId as string,
        date: req.body?.date as string | undefined,
        startTime: req.body?.startTime as string | undefined,
        endTime: req.body?.endTime as string | undefined,
        reason: req.body?.reason as string | undefined,
        newSlots: Array.isArray(req.body?.newSlots)
          ? (req.body.newSlots as Array<{ day: string; slot: string }>)
          : undefined,
      };
      const doc = await ChangeRequestService.create({ user: req.user, payload });
      return ok(res, doc, HttpStatus.CREATED);
    } catch (error) {
      return fail(res, error, "Không thể tạo đề xuất");
    }
  },

  async listMine(req: AuthRequest, res: Response) {
    try {
      const list = await ChangeRequestService.listMine(req.user);
      return ok(res, list, HttpStatus.OK);
    } catch (error) {
      return fail(res, error, "Không thể lấy đề xuất của bạn");
    }
  },

  async listAll(_req: AuthRequest, res: Response) {
    try {
      const list = await ChangeRequestService.listAll();
      return ok(res, list, HttpStatus.OK);
    } catch (error) {
      return fail(res, error, "Không thể lấy danh sách đề xuất");
    }
  },

  async review(req: AuthRequest, res: Response) {
    try {
      const id = req.params?.id as string;
      const action = req.body?.action as "approve" | "reject";
      const note = req.body?.note as string | undefined;
      const updated = await ChangeRequestService.review({ id, action, note, reviewer: req.user });
      return ok(res, updated, HttpStatus.OK);
    } catch (error) {
      return fail(res, error, "Không thể cập nhật trạng thái đề xuất");
    }
  },
};
