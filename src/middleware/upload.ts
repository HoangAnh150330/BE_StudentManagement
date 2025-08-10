import multer from 'multer';
import path from 'path';
import fs from 'fs';

const TEMP_DIR = path.resolve('./uploads/temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const ownerId = (req.params.id || 'anonymous').toString();
    cb(null, `${ownerId}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype);
  if (!ok) return cb(new Error('Chỉ chấp nhận ảnh (jpg, jpeg, png, webp)'));
  cb(null, true);
};

export const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('file'); // field name = "file"
