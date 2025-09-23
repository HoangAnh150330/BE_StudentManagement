// routes/change-request.ts
import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/authmiddleware";
import { asHandler } from "../utils/asHandler";
import { ChangeRequestController } from "../controllers/changeRequest-controller";

const router = Router();

// Teacher: tạo đề xuất
router.post(
  "/",
  authMiddleware,
  requireRole("teacher"),
  asHandler(ChangeRequestController.create)
);

// Teacher: xem đề xuất của tôi
router.get(
  "/mine",
  authMiddleware,
  requireRole("teacher"),
  asHandler(ChangeRequestController.listMine)
);

// Admin: xem tất cả
router.get(
  "/",
  authMiddleware,
  requireRole("admin"),
  asHandler(ChangeRequestController.listAll)
);

// Admin: duyệt / từ chối
router.put(
  "/:id/review",
  authMiddleware,
  requireRole("admin"),
  asHandler(ChangeRequestController.review)
);

export default router;
