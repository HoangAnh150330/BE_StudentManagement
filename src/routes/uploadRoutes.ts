import { Router } from 'express';
import { uploadImage } from '../middleware/upload';
import { uploadAvatar } from '../controllers/uploadController';
// import auth middleware nếu cần
// import { auth } from '../middleware/auth';

const router = Router();
router.post('/avatar/:id', uploadImage, uploadAvatar);

export default router;
