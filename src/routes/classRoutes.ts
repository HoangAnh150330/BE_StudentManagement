import express from "express";
import {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
} from "../controllers/classController";

const router = express.Router();

router.get("/getall-class", getAllClasses);
router.get("/getclass-byid/:id", getClassById);
router.post("/create-class", createClass);
router.put("/update-class/:id", updateClass);
router.delete("/delete-class/:id", deleteClass);

export default router;
