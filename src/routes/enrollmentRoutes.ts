import express from "express";
import { enrollClass, cancelEnrollment, getStudentSchedule } from "../controllers/enrollController";
import { authMiddleware } from "../middleware/authmiddleware";

const router = express.Router();

// ✅ POST /api/enrollments/:classId
router.post("/:classId", authMiddleware, enrollClass);

// ✅ DELETE /api/enrollments/:classId
router.delete("/:classId", authMiddleware, cancelEnrollment);

// ✅ GET /api/enrollments/student/:id
router.get("/student/:id", authMiddleware, getStudentSchedule);

export default router;
