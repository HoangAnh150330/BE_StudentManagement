import { Request, Response } from 'express';
import User from '../models/UserModels';
import { uploadToCloudinary, destroyFromCloudinary } from '../services/image.service';
import { getPublicIdFromUrl, safeUnlink } from '../utils/image';

export const uploadAvatar = async (req: Request, res: Response) => {
  const tempPath = (req.file as Express.Multer.File | undefined)?.path;
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      await safeUnlink(tempPath);
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    if (!req.file) return res.status(400).json({ message: 'Không có file được tải lên' });

    const result = await uploadToCloudinary(req.file.path, {
      folder: 'avatars',
      publicId: `avatar_${userId}_${Date.now()}`,
      transformations: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
    });

    const oldPublicId = getPublicIdFromUrl(user.avatar);
    if (oldPublicId) await destroyFromCloudinary(oldPublicId).catch(() => {});

    user.avatar = result.secure_url;
    await user.save();

    return res.json({ message: 'Tải ảnh avatar thành công', avatar: result.secure_url });
  } catch (e) {
    console.error('Lỗi upload avatar:', e);
    return res.status(500).json({ message: 'Lỗi server' });
  } finally {
    await safeUnlink(tempPath);
  }
};
