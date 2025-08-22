import { Router } from "express";
import {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controllers/subject-controller"; 
import { authMiddleware, requireRole } from "../middleware/authmiddleware";

const router = Router();

router.get("/getall-subject", getAllSubjects);

router.post("/create-subject", authMiddleware, requireRole("admin","teacher"), createSubject);
router.put("/update-subject/:id", authMiddleware, requireRole("admin","teacher"), updateSubject);
router.delete("/delete-subject/:id", authMiddleware, requireRole("admin"), deleteSubject);

export default router;
