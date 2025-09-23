import { Router } from "express";
import { authMiddleware } from "../middleware/authmiddleware";
import { asHandler } from "../utils/asHandler";

import {
  getMyClasses,
  getClassStudents,
  downloadClassStudents,
  getTeacherSchedule,
} from "../controllers/teacherClass-controller";

import {
  markAttendance,
  updateAttendance,
  getAttendanceByDate,
} from "../controllers/attendance-controller";

import { getGrades, addGrade, updateGrade } from "../controllers/grade-controller";
import { uploadMaterial, getMaterials, updateMaterial, deleteMaterial } from "../controllers/material-controller";
import { sendAnnouncement, getAnnouncements } from "../controllers/announcement-controller";
import { getSchedule, updateSchedule } from "../controllers/schedule-controller";
import { ChangeRequestController } from "../controllers/changeRequest-controller";

const router = Router();

/* ----------- Quản lý lớp học ----------- */
router.get("/classes", authMiddleware, asHandler(getMyClasses));
router.get("/classes/:id/students", authMiddleware, asHandler(getClassStudents));
router.get("/classes/:id/students/download", authMiddleware, asHandler(downloadClassStudents));

/* --------- Lịch dạy --------- */
router.get("/schedule/me", authMiddleware, asHandler(getTeacherSchedule));
router.get("/schedule", authMiddleware, asHandler(getSchedule));
router.put("/schedule/:id", authMiddleware, asHandler(updateSchedule));

/* -------------- Điểm danh --------------- */
router.get("/attendance", authMiddleware, asHandler(getAttendanceByDate));
router.post("/attendance", authMiddleware, asHandler(markAttendance));
router.put("/attendance/:id", authMiddleware, asHandler(updateAttendance));

/* --------------- Điểm số ---------------- */
router.get("/grades", authMiddleware, asHandler(getGrades));
router.post("/grades", authMiddleware, asHandler(addGrade));
router.put("/grades/:id", authMiddleware, asHandler(updateGrade));

/* --------- Tài liệu giảng dạy ---------- */
router.post("/materials", authMiddleware, asHandler(uploadMaterial));
router.get("/materials/:classId", authMiddleware, asHandler(getMaterials));
router.put("/materials/:id", authMiddleware, asHandler(updateMaterial));
router.delete("/materials/:id", authMiddleware, asHandler(deleteMaterial));

/* --------------- Thông báo -------------- */
router.post("/announcements", authMiddleware, asHandler(sendAnnouncement));
router.get("/announcements/:classId", authMiddleware, asHandler(getAnnouncements));

/* --------------- Đề xuất đổi lịch -------------- */
router.post("/change-requests", authMiddleware, asHandler(ChangeRequestController.create));
router.get("/change-requests/mine", authMiddleware, asHandler(ChangeRequestController.listMine));

export default router;
