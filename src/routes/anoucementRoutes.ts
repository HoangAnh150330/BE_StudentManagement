import { Router } from "express";
import {
  sendAnnouncement,
  getAnnouncements,
  getAnnouncementsForStudent,
} from "../controllers/announcement-controller";
import { authMiddleware } from "../middleware/authmiddleware";

const router = Router();

/**
 * POST /api/announcements
 * -> Gửi thông báo cho lớp (giáo viên/admin)
 */
router.post("/", authMiddleware, sendAnnouncement);

/**
 * GET /api/announcements/:classId
 * -> Lấy danh sách thông báo theo lớp
 */
router.get("/:classId", authMiddleware, getAnnouncements);

/**
 * GET /api/announcements/student/mine
 * -> Lấy tất cả thông báo cho học sinh dựa vào lớp đã đăng ký
 */
router.get("/student/mine", authMiddleware, getAnnouncementsForStudent);

export default router;
