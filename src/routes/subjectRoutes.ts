import { Router } from "express";
import {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../controllers/subjectController";

const router = Router();

router.get("/getall-subject", getAllSubjects);
router.post("/create-subject", createSubject);
router.put("/update-subject/:id", updateSubject);
router.delete("/delete-subject/:id", deleteSubject);

export default router;