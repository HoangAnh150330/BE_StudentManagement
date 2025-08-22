import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/authmiddleware";
import User from "../models/UserModels";

const router = Router();

// GET /api/admin/teachers
router.get(
  "/teachers",
  authMiddleware,
  requireRole("admin"),
  async (_req, res) => {
    const teachers = await User.find({ role: "teacher" })
      .select("_id name email"); // FE chỉ cần thế này
    res.json(teachers);          // trả mảng thuần cho FE
  }
);

export default router;
