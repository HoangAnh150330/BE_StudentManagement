import { Router } from "express";
import {
  getAllStudents,
  updateStudent,
  deleteStudent,
  getUserProfile,
  uploadAvatar,
} from "../controllers/userController";
import { authMiddleware } from "../middleware/authmiddleware";
import multer from "multer";

const router = Router();
const upload = multer({ dest: "uploads/" }); // chỉnh theo cấu hình bạn dùng

// ===== Students & Profile =====
router.get("/getall-student", authMiddleware, getAllStudents);
router.put("/update-student/:id", authMiddleware, updateStudent);
router.delete("/delete-student/:id", authMiddleware, deleteStudent);
router.get("/:id", authMiddleware, getUserProfile);

// Upload avatar (nếu bạn dùng FormData field 'file')
router.post(
  "/user/:id/avatar",
  authMiddleware,
  upload.single("file"),
  uploadAvatar
);

export default router;
