import { Router } from "express";
import {
  getAllStudents,
  getUserProfile,
  updateStudent,
  deleteStudent,
} from "../controllers/student-controlller"; 
import { authMiddleware, requireRole } from "../middleware/authmiddleware";

const r = Router();
r.use(authMiddleware);

r.get("/", requireRole("admin"), getAllStudents);
r.get("/:id", requireRole("admin", "teacher", "student"), getUserProfile);
r.patch("/:id", requireRole("admin", "student"), updateStudent);
r.delete("/:id", requireRole("admin"), deleteStudent);



export default r;
