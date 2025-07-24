import { Request, Response } from "express";
import Class from "../models/Class";

export const getAllClasses = async (_req: Request, res: Response) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ khi lấy danh sách lớp học." });
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData) return res.status(404).json({ message: "Không tìm thấy lớp học." });
    res.json(classData);
  } catch (err) {
    res.status(500).json({ message: "Lỗi máy chủ khi lấy lớp học." });
  }
};

export const createClass = async (req: Request, res: Response) => {
  try {
    const { name, course, teacher } = req.body;
    const newClass = await Class.create({ name, course, teacher });
    res.status(201).json(newClass);
  } catch (err) {
    res.status(400).json({ message: "Tạo lớp học thất bại." });
  }
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const updated = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Không tìm thấy lớp học để cập nhật." });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Cập nhật lớp học thất bại." });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const deleted = await Class.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy lớp học để xoá." });
    res.json({ message: "Đã xoá lớp học." });
  } catch (err) {
    res.status(500).json({ message: "Xoá lớp học thất bại." });
  }
};