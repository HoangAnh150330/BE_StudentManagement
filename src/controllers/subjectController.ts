import { Request, Response } from "express";
import Subject from "../models/Subject";

//Lấy tất cả môn hocj
export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

// Tạo môn học mới
export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, code, credit } = req.body;

    if (!name || !code || credit === undefined)
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });

    const exists = await Subject.findOne({ code });
    if (exists)
      return res.status(409).json({ message: "Mã môn học đã tồn tại" });

    const newSubject = new Subject({ name, code, credit });
    await newSubject.save();

    res.status(201).json(newSubject);
  } catch (err) {
    res.status(500).json({ message: "Không thể tạo môn học" });
  }
};

// Cập nhật
export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, credit } = req.body;

    const updated = await Subject.findByIdAndUpdate(
      id,
      { name, code, credit },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Không tìm thấy môn học" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Không thể cập nhật môn học" });
  }
};

// Xóa
export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await Subject.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy môn học" });

    res.json({ message: "Đã xóa môn học" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi xóa môn học" });
  }
};
