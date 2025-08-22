import path from "path";
import fs from "fs";
import express from "express";
import multer from "multer";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// POST /api/upload  -> { success:true, data: { url,size,name } }
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file" });
  const url = `/uploads/${req.file.filename}`;
  return res.json({
    success: true,
    data: { url, size: req.file.size, name: req.file.originalname },
  });
});

export default router;
