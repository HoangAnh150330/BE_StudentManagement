// services/class-service.ts
import { Types, FilterQuery } from "mongoose";
import Class, { IClass } from "../models/Class";
import Subject from "../models/Subject";
import User from "../models/UserModels";
import { AppError, HttpStatus } from "../utils/http";

/* ============= Types & helpers ============= */

type RawSlot = { day: string; slot: string };
type Slot = { dayOfWeek: number; start: string; end: string; classId?: string; name?: string };

const weekdayLabel = ["", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

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
  return { dayOfWeek, start: (start || "").trim(), end: (end || "").trim() };
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
  teacherId: string,
  rawNewSlots: RawSlot[],
  ignoreClassId?: string
) => {
  if (!Types.ObjectId.isValid(teacherId)) {
    throw new AppError("teacherId không hợp lệ", HttpStatus.BAD_REQUEST);
  }

  const query: FilterQuery<IClass> = { teacherId: new Types.ObjectId(teacherId) };
  if (ignoreClassId) query._id = { $ne: new Types.ObjectId(ignoreClassId) };

  const classes = await Class.find(query).lean();

  const existing: Slot[] = [];
  for (const c of classes) {
    for (const s of (c.timeSlots as RawSlot[])) {
      const slot = normalizeOne(s);
      existing.push({ ...slot, classId: String(c._id), name: (c as any).name });
    }
  }

  const incoming = rawNewSlots.map(normalizeOne);

  const conflicts = findConflicts(incoming, existing);
  if (conflicts.length) {
    const detail = conflicts
      .map(cf => {
        const day = weekdayLabel[cf.dayOfWeek] || `Day ${cf.dayOfWeek}`;
        return `• ${day} ${cf.a.start}-${cf.a.end} trùng với lớp "${cf.b.name}" (${cf.b.start}-${cf.b.end})`;
      })
      .join("\n");
    throw new AppError(`Giáo viên đã có lịch trùng:\n${detail}`, HttpStatus.CONFLICT);
  }
};

const attachTeacherName = (doc: any) => {
  if (!doc) return doc;
  const out = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  if (out && out.teacherId && typeof out.teacherId === "object" && "name" in out.teacherId) {
    (out as any).teacherName = (out.teacherId as any).name;
  }
  return out;
};

/* ============= Service API ============= */

export const ClassService = {
  async getAll() {
    const docs = await Class.find().populate("teacherId", "name email");
    return docs.map(d => attachTeacherName(d));
  },

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new AppError("classId không hợp lệ", HttpStatus.BAD_REQUEST);
    const doc = await Class.findById(id).populate("teacherId", "name email");
    if (!doc) throw new AppError("Không tìm thấy lớp học.", HttpStatus.NOT_FOUND);
    return attachTeacherName(doc);
  },

  async create(params: {
    name: string;
    subject: string;
    teacherId: string;
    maxStudents: number;
    timeSlots: RawSlot[];
  }) {
    const { name, subject, teacherId, maxStudents, timeSlots } = params;

    if (
      !name ||
      !subject ||
      !teacherId ||
      typeof maxStudents !== "number" ||
      maxStudents < 1 ||
      !Array.isArray(timeSlots) ||
      timeSlots.length === 0
    ) {
      throw new AppError("Vui lòng nhập đầy đủ thông tin.", HttpStatus.BAD_REQUEST);
    }

    if (!Types.ObjectId.isValid(teacherId)) {
      throw new AppError("teacherId không hợp lệ", HttpStatus.BAD_REQUEST);
    }

    // Validate teacherId là 1 giáo viên hợp lệ
    const teacher = await User.findOne({ _id: teacherId, role: "teacher" }).select("_id");
    if (!teacher) throw new AppError("teacherId không hợp lệ", HttpStatus.BAD_REQUEST);

    // Check trùng lịch theo teacherId
    await ensureNoTeacherConflict(teacherId, timeSlots);

    const newClass = await Class.create({ name, subject, teacherId, maxStudents, timeSlots });

    // Đồng bộ Subject.classes
    await Subject.findOneAndUpdate(
      { name: subject },
      { $addToSet: { classes: newClass._id } }
    );

    const populated = await Class.findById(newClass._id).populate("teacherId", "name email");
    return attachTeacherName(populated);
  },

  async update(id: string, params: {
    name: string;
    subject: string;
    teacherId: string;
    maxStudents: number;
    timeSlots: RawSlot[];
  }) {
    const { name, subject, teacherId, maxStudents, timeSlots } = params;

    if (
      !name ||
      !subject ||
      !teacherId ||
      typeof maxStudents !== "number" ||
      maxStudents < 1 ||
      !Array.isArray(timeSlots) ||
      timeSlots.length === 0
    ) {
      throw new AppError("Vui lòng nhập đầy đủ thông tin.", HttpStatus.BAD_REQUEST);
    }

    if (!Types.ObjectId.isValid(teacherId)) {
      throw new AppError("teacherId không hợp lệ", HttpStatus.BAD_REQUEST);
    }

    const teacher = await User.findOne({ _id: teacherId, role: "teacher" }).select("_id");
    if (!teacher) throw new AppError("teacherId không hợp lệ", HttpStatus.BAD_REQUEST);

    // Check trùng lịch, bỏ qua chính lớp đang sửa
    await ensureNoTeacherConflict(teacherId, timeSlots, id);

    const updated = await Class.findByIdAndUpdate(
      id,
      { name, subject, teacherId, maxStudents, timeSlots },
      { new: true }
    ).populate("teacherId", "name email");

    if (!updated) throw new AppError("Không tìm thấy lớp học để cập nhật.", HttpStatus.NOT_FOUND);

    // Nếu đổi subject, đồng bộ mapping
    await Subject.updateMany(
      { classes: updated._id, name: { $ne: updated.subject } },
      { $pull: { classes: updated._id } }
    );
    await Subject.findOneAndUpdate(
      { name: updated.subject },
      { $addToSet: { classes: updated._id } }
    );

    return attachTeacherName(updated);
  },

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new AppError("classId không hợp lệ", HttpStatus.BAD_REQUEST);
    const deleted = await Class.findByIdAndDelete(id);
    if (!deleted) throw new AppError("Không tìm thấy lớp học để xoá.", HttpStatus.NOT_FOUND);

    await Subject.updateOne(
      { name: deleted.subject },
      { $pull: { classes: deleted._id } }
    );

    return { message: "Đã xoá lớp học." };
  },
};
