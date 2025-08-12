import { Request, Response } from "express";
import User from "../models/UserModels";

// ========== Students & Profile ==========

export const getAllStudents = async (_req: Request, res: Response) => {
  try {
    const students = await User.find({ role: "student" }).select("-password -otp -otpExpires");
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json(user);
  } catch (err) {
    console.error("Lỗi server:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Chỉ cho phép cập nhật một số field hồ sơ
    const { name, phone, gender, dob, province, avatar } = req.body;
    const updateData: Record<string, unknown> = {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(gender !== undefined && { gender }),
      ...(dob !== undefined && { dob }),
      ...(province !== undefined && { province }),
      ...(avatar !== undefined && { avatar }),
    };

    const student = await User.findByIdAndUpdate(id, updateData, { new: true }).select(
      "-password -otp -otpExpires"
    );
    if (!student) return res.status(404).json({ message: "Student not found" });

    return res.json({ message: "Update successful", student });
  } catch (err) {
    console.error("Error updating student:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await User.findOneAndDelete({ _id: id, role: "student" });

    if (!deleted) return res.status(404).json({ message: "Không tìm thấy học sinh" });

    res.json({ message: "Xóa học sinh thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ========== Upload Avatar (nếu bạn dùng FormData 'file') ==========
// Cần middleware multer trước route để có req.file
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: "Không có file" });

    // Nếu bạn serve static '/uploads' => url như dưới
    const avatarUrl = `/uploads/${file.filename}`;

    const user = await User.findByIdAndUpdate(id, { avatar: avatarUrl }, { new: true }).select(
      "-password -otp -otpExpires"
    );
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    return res.json({ message: "Tải avatar thành công", avatar: avatarUrl, user });
  } catch (err) {
    console.error("Upload avatar error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
