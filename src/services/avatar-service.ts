// services/avatar-service.ts
import User from "../models/UserModels";
import { uploadToCloudinary, destroyFromCloudinary } from "../services/image.service";
import { getPublicIdFromUrl } from "../utils/image";
import { AppError, HttpStatus } from "../utils/http";

// Config qua ENV, mặc định 5MB và các định dạng ảnh phổ biến
const MAX_AVATAR_BYTES = Number(process.env.AVATAR_MAX_BYTES ?? 5 * 1024 * 1024);
const ALLOWED_MIME = String(process.env.AVATAR_ALLOWED_MIME ?? "image/jpeg,image/png,image/webp")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const AvatarService = {
  /**
   * Upload avatar từ file tạm (localPath), thay ảnh cũ nếu có.
   * - Validate userId, mimetype, size
   * - Upload Cloudinary (crop face 200x200)
   * - Xoá ảnh cũ nếu tồn tại
   * - Lưu URL mới vào user.avatar
   */
  async setFromLocalFile(params: {
    userId?: string;
    localPath?: string;
    mimetype?: string;
    size?: number;
  }): Promise<{ avatar: string }> {
    const { userId, localPath, mimetype, size } = params;

    if (!userId) throw new AppError("Thiếu userId", HttpStatus.BAD_REQUEST);
    if (!localPath) throw new AppError("Không có file được tải lên", HttpStatus.BAD_REQUEST);

    if (!mimetype) throw new AppError("Thiếu mimetype", HttpStatus.BAD_REQUEST);
    const mime = mimetype.toLowerCase();
    if (!ALLOWED_MIME.includes(mime)) {
      // Nếu bạn mở rộng HttpStatus, có thể dùng HttpStatus.UNSUPPORTED_MEDIA_TYPE (415)
      throw new AppError("Định dạng file không được hỗ trợ", HttpStatus.BAD_REQUEST);
    }

    if (typeof size === "number" && size > MAX_AVATAR_BYTES) {
      // Nếu bạn mở rộng HttpStatus, có thể dùng HttpStatus.PAYLOAD_TOO_LARGE (413)
      throw new AppError(
        `Kích thước ảnh vượt quá giới hạn ${MAX_AVATAR_BYTES} bytes`,
        HttpStatus.BAD_REQUEST
      );
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError("Không tìm thấy người dùng", HttpStatus.NOT_FOUND);

    const result = await uploadToCloudinary(localPath, {
      folder: "avatars",
      publicId: `avatar_${userId}_${Date.now()}`,
      transformations: [{ width: 200, height: 200, crop: "fill", gravity: "face" }],
    });

    // Xoá ảnh cũ nếu có (best effort)
    const oldPublicId = getPublicIdFromUrl(user.avatar);
    if (oldPublicId) {
      await destroyFromCloudinary(oldPublicId).catch(() => {});
    }

    user.avatar = result.secure_url;
    await user.save();

    return { avatar: result.secure_url };
  },
};
