// src/controllers/class.controller.ts
import { Request, Response } from "express";
import Class from "../models/Class";
import Subject from "../models/Subject";

/* ===================== Helpers ===================== */

type RawSlot = { day: string; slot: string };
type Slot = { dayOfWeek: number; start: string; end: string; classId?: string; name?: string };

const weekdayLabel = ["", "Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ nhật"];

const dayMap: Record<string, number> = {
  "thứ 2": 1, "thu 2": 1,
  "thứ 3": 2, "thu 3": 2,
  "thứ 4": 3, "thu 4": 3,
  "thứ 5": 4, "thu 5": 4,
  "thứ 6": 5, "thu 6": 5,
  "thứ 7": 6, "thu 7": 6,
  "chủ nhật": 7, "chu nhat": 7,
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

const isRangeOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  // chạm biên không coi là trùng (09:00-10:00 và 10:00-11:00 OK)
  const s1 = toMinutes(aStart), e1 = toMinutes(aEnd);
  const s2 = toMinutes(bStart), e2 = toMinutes(bEnd);
  return s1 < e2 && s2 < e1;
};

const normalizeOne = (item: RawSlot): Slot => {
  const key = (item.day || "").trim().toLowerCase();
  const dayOfWeek = dayMap[key];
  const [start, end] = String(item.slot).split("-");
  return { dayOfWeek, start: start.trim(), end: end.trim() };
};

const findConflicts = (incoming: Slot[], existing: Slot[]) => {
  const conflicts: { dayOfWeek: number; a: Slot; b: Slot }[] = [];
  for (const a of incoming) {
    for (const b of existing) {
      if (!a.dayOfWeek || !b.dayOfWeek) continue;
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (isRangeOverlap(a.start, a.end, b.start, b.end)) {
        conflicts.push({ dayOfWeek: a.dayOfWeek, a, b });
      }
    }
  }
  return conflicts;
};

const ensureNoTeacherConflict = async (
  teacherName: string,
  rawNewSlots: RawSlot[],
  ignoreClassId?: string
) => {
  // Tìm tất cả lớp của giáo viên (trừ lớp đang update)
  const query: any = { teacher: teacherName };
  if (ignoreClassId) query._id = { $ne: ignoreClassId };
  const classes = await Class.find(query).lean();

  // Chuẩn hoá slot hiện có
  const existing: Slot[] = [];
  for (const c of classes) {
    for (const s of (c.timeSlots as RawSlot[])) {
      const slot = normalizeOne(s);
      existing.push({ ...slot, classId: String(c._id), name: c.name });
    }
  }

  // Chuẩn hoá slot mới
  const incoming = rawNewSlots.map(normalizeOne);

  // Check overlap
  const conflicts = findConflicts(incoming, existing);
  if (conflicts.length) {
    const detail = conflicts
      .map(cf => {
        const day = weekdayLabel[cf.dayOfWeek] || `Day ${cf.dayOfWeek}`;
        return `• ${day} ${cf.a.start}-${cf.a.end} trùng với lớp "${cf.b.name}" (${cf.b.start}-${cf.b.end})`;
      })
      .join("\n");
    const err: any = new Error(`Giáo viên đã có lịch trùng:\n${detail}`);
    err.status = 409;
    throw err;
  }
};

/* ===================== Controllers ===================== */

export const getAllClasses = async (_req: Request, res: Response) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch {
    res.status(500).json({ message: "Lỗi máy chủ khi lấy danh sách lớp học." });
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    const classData = await Class.findById(req.params.id);
    if (!classData) return res.status(404).json({ message: "Không tìm thấy lớp học." });
    res.json(classData);
  } catch {
    res.status(500).json({ message: "Lỗi máy chủ khi lấy lớp học." });
  }
};

export const createClass = async (req: Request, res: Response) => {
  try {
    const { name, subject, teacher, maxStudents, timeSlots } = req.body as {
      name: string; subject: string; teacher: string; maxStudents: number; timeSlots: RawSlot[];
    };

    if (!name || !subject || !teacher || !maxStudents || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
    }

    // Check trùng lịch theo giáo viên
    await ensureNoTeacherConflict(teacher, timeSlots);

    const newClass = await Class.create({ name, subject, teacher, maxStudents, timeSlots });

    // cập nhật Subject -> thêm class id
    await Subject.findOneAndUpdate(
      { name: subject },
      { $addToSet: { classes: newClass._id } }
    );

    res.status(201).json(newClass);
  } catch (err: any) {
    res.status(err?.status || 400).json({ message: err?.message || "Tạo lớp học thất bại." });
  }
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const { name, subject, teacher, maxStudents, timeSlots } = req.body as {
      name: string; subject: string; teacher: string; maxStudents: number; timeSlots: RawSlot[];
    };

    if (!name || !subject || !teacher || !maxStudents || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
    }

    // Check trùng lịch, bỏ qua chính lớp đang sửa
    await ensureNoTeacherConflict(teacher, timeSlots, req.params.id);

    const updated = await Class.findByIdAndUpdate(
      req.params.id,
      { name, subject, teacher, maxStudents, timeSlots },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Không tìm thấy lớp học để cập nhật." });

    // nếu đổi subject, đồng bộ lại mapping
    if (updated) {
      // kéo id ra khỏi các subject khác không còn khớp
      await Subject.updateMany(
        { classes: updated._id, name: { $ne: updated.subject } },
        { $pull: { classes: updated._id } }
      );
      // add vào subject hiện tại
      await Subject.findOneAndUpdate(
        { name: updated.subject },
        { $addToSet: { classes: updated._id } }
      );
    }

    res.json(updated);
  } catch (err: any) {
    res.status(err?.status || 500).json({ message: err?.message || "Cập nhật lớp học thất bại." });
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const deleted = await Class.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy lớp học để xoá." });

    await Subject.updateOne(
      { name: deleted.subject },
      { $pull: { classes: deleted._id } }
    );

    res.json({ message: "Đã xoá lớp học." });
  } catch {
    res.status(500).json({ message: "Xoá lớp học thất bại." });
  }
};
