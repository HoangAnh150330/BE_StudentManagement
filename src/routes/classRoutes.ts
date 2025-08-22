import express from "express";
import {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
} from "../controllers/class-controller"; // nếu file là class.controller.ts => đổi import
import { authMiddleware, requireRole } from "../middleware/authmiddleware";

const router = express.Router();

router.get("/getall-class", getAllClasses);
router.get("/getclass-byid/:id", getClassById);

// chỉ admin (hoặc admin|teacher tuỳ policy của bạn)
router.post("/create-class", authMiddleware, requireRole("admin"), createClass);
router.put("/update-class/:id", authMiddleware, requireRole("admin"), updateClass);
router.delete("/delete-class/:id", authMiddleware, requireRole("admin"), deleteClass);

export default router;
