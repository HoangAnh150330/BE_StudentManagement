// controllers/class.controller.ts
import type { Request, Response } from "express";
import { ClassService } from "../services/class-service";
import { ok, fail, HttpStatus } from "../utils/http";

/* ===================== Controllers ===================== */

export const getAllClasses = async (_req: Request, res: Response) => {
  try {
    const data = await ClassService.getAll();
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi máy chủ khi lấy danh sách lớp học.");
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    const data = await ClassService.getById(req.params.id);
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Lỗi máy chủ khi lấy lớp học.");
  }
};

export const createClass = async (req: Request, res: Response) => {
  try {
    const { name, subject, teacherId, maxStudents, timeSlots } = req.body as {
      name: string;
      subject: string;
      teacherId: string;
      maxStudents: number;
      timeSlots: { day: string; slot: string }[];
    };

    const data = await ClassService.create({ name, subject, teacherId, maxStudents, timeSlots });
    return ok(res, data, HttpStatus.CREATED);
  } catch (e) {
    return fail(res, e, "Tạo lớp học thất bại.");
  }
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const { name, subject, teacherId, maxStudents, timeSlots } = req.body as {
      name: string;
      subject: string;
      teacherId: string;
      maxStudents: number;
      timeSlots: { day: string; slot: string }[];
    };

    const data = await ClassService.update(req.params.id, {
      name, subject, teacherId, maxStudents, timeSlots,
    });
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Cập nhật lớp học thất bại.");
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const data = await ClassService.remove(req.params.id);
    return ok(res, data, HttpStatus.OK);
  } catch (e) {
    return fail(res, e, "Xoá lớp học thất bại.");
  }
};
