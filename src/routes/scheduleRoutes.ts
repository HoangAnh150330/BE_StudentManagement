import express from "express";
import { getTeachingSchedule } from "../controllers/scheduleController";

const router = express.Router();

router.get("/teaching-schedule", getTeachingSchedule);

export default router;
