// src/index.ts
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import { v2 as cloudinary } from "cloudinary";

// Routes
import authRoutes from "./routes/authRoutes";
import subjectRoutes from "./routes/subjectRoutes";
import classRoutes from "./routes/classRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import enrollmentRoutes from "./routes/enrollmentRoutes";
import studentRoutes from "./routes/studentRoutes";  
import adminRoutes from "./routes/adminRoutes";       
import teacherRoutes from "./routes/teacherRoutes";   
import announcementRoutes from "./routes/anoucementRoutes";

// Error utils & middlewares
import { HttpStatus } from "./utils/http";
import { errorMiddleware } from "./middleware/error-middleware";

/* ===================== ENV ===================== */
const PORT = Number(process.env.PORT ?? 3000);
const MONGODB_URI = process.env.MONGODB_URI ?? "";
const CORS_ORIGIN =
  process.env.CORS_ORIGIN ??
  "http://localhost:5173"; // FE dev origin (vừng cho Vite)

// Just to know at boot
console.log("🔐 JWT_SECRET present? ->", Boolean(process.env.JWT_SECRET));
if (!MONGODB_URI) {
  console.warn("⚠️  Missing MONGODB_URI env. Set it in .env");
}

/* ===================== Cloudinary (optional) ===================== */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ===================== App ===================== */
const app = express();

// Security & CORS
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Static (nếu có upload vào thư mục /uploads)
app.use("/uploads", express.static("uploads"));

/* ===================== Healthcheck ===================== */
app.get("/api/health", (_req, res) => res.status(HttpStatus.OK).send("OK"));
app.get("/", (_req, res) => res.send("Hello Management"));

/* ===================== Mount Routes (base: /api) ===================== */
app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/announcements", announcementRoutes);
// Admin
app.use("/api/admin/students", studentRoutes);
app.use("/api/admin", adminRoutes);

// Teacher
app.use("/api/teacher", teacherRoutes);

/* ===================== 404 & Error Handler ===================== */
// 404 – để SAU khi mount route
app.use((req, res) => {
  res
    .status(HttpStatus.NOT_FOUND)
    .json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler (xử lý AppError + lỗi không kiểm soát)
app.use(errorMiddleware);

/* ===================== DB & Start ===================== */
async function start() {
  try {
    if (!MONGODB_URI) throw new Error("MONGODB_URI is not set");

    // Khuyến nghị option ổn định kết nối
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });
    console.log("✅ MongoDB connected");

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      console.log(`\n${signal} received. Closing server...`);
      server.close(() => {
        mongoose.connection.close(false).then(() => {
          console.log("🔌 DB connection closed. Bye!");
          process.exit(0);
        });
      });
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ Startup error:", msg);
    process.exit(1);
  }
}

start();

export default app;
