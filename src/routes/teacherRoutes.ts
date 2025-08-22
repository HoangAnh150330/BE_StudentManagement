import { Router } from "express";
import { authMiddleware } from "../middleware/authmiddleware";
import { asHandler } from "../utils/asHandler";

import {
  getMyClasses,
  getClassStudents,
  downloadClassStudents,
  getTeacherSchedule,         // lịch GV (của chính GV)
} from "../controllers/teacherClass-controller"; // hoặc teacherClass.controller

import {
  markAttendance,
  updateAttendance,
  getAttendanceByDate
} from "../controllers/attendance-controller";    // hoặc attendance.controller

import { addGrade, updateGrade } from "../controllers/grade-controller"; // hoặc grade.controller
import {
  uploadMaterial,
  getMaterials,
  updateMaterial,
  deleteMaterial,
} from "../controllers/material-controller";      // hoặc material.controller

import {
  sendAnnouncement,
  getAnnouncements,
} from "../controllers/announcement-controller";  // hoặc announcement.controller

import {
  getSchedule,             // lấy lịch theo teacher đang đăng nhập
  updateSchedule,          // cập nhật lịch dạy lớp
} from "../controllers/schedule-controller";      // ⚠️ chuyển import từ announcement → schedule

const router = Router();

/* ----------- Quản lý lớp học ----------- */
router.get("/classes", authMiddleware, asHandler(getMyClasses));
router.get("/classes/:id/students", authMiddleware, asHandler(getClassStudents));
router.get("/classes/:id/students/download", authMiddleware, asHandler(downloadClassStudents));

/* --------- Lịch dạy --------- */
// tránh đè route: dùng /schedule/me cho lịch của giáo viên đăng nhập
router.get("/schedule/me", authMiddleware, asHandler(getTeacherSchedule));
// và tách endpoint lấy lịch (theo service schedule) rõ ràng:
router.get("/schedule", authMiddleware, asHandler(getSchedule));
router.put("/schedule/:id", authMiddleware, asHandler(updateSchedule));

/* -------------- Điểm danh --------------- */
router.get("/attendance", authMiddleware, asHandler(getAttendanceByDate));
router.post("/attendance", authMiddleware, asHandler(markAttendance));
router.put("/attendance/:id", authMiddleware, asHandler(updateAttendance));

/* --------------- Điểm số ---------------- */
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

export default router;
