// services/schedule-service.ts
import { Types } from "mongoose";
import ClassModel from "../models/Class";
import SubjectModel from "../models/Subject";
import { AppError, HttpStatus } from "../utils/http";

type TimeSlot = { day: string; slot: string };
type User = { _id: string; role: "admin" | "teacher" | "student" };

type ClassDocLean = {
  _id: Types.ObjectId;
  name?: string;
  subject?: string;
  teacher?: string;
  teacherId?: { _id: Types.ObjectId; name?: string; email?: string };
  teacherName?: string;
  timeSlots?: TimeSlot[];
};

const DAY_INDEX: Record<string, number> = {
  "chủ nhật": 0, "chu nhat": 0, "sun": 0,
  "thứ 2": 1, "thu 2": 1, "mon": 1,
  "thứ 3": 2, "thu 3": 2, "tue": 2,
  "thứ 4": 3, "thu 4": 3, "wed": 3,
  "thứ 5": 4, "thu 5": 4, "thu": 4,
  "thứ 6": 5, "thu 6": 5, "fri": 5,
  "thứ 7": 6, "thu 7": 6, "sat": 6,
};

const toOid = (id?: string, field = "id") => {
  if (!id) throw new AppError(`Thiếu ${field}`, HttpStatus.BAD_REQUEST);
  if (!Types.ObjectId.isValid(id)) throw new AppError(`${field} không hợp lệ`, HttpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

const nextDateFromDay = (today: Date, targetDayIndex: number): Date => {
  const d = new Date(today);
  const offset = (targetDayIndex - today.getDay() + 7) % 7;
  d.setDate(today.getDate() + offset);
  return d;
};

const parseSlot = (slot: string) => {
  const [s, e] = slot.split("-");
  if (!s || !e) throw new AppError("slot không hợp lệ (định dạng HH:mm-HH:mm)", HttpStatus.BAD_REQUEST);
  const [sh, sm] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) {
    throw new AppError("slot không hợp lệ (giờ/phút phải là số)", HttpStatus.BAD_REQUEST);
  }
  return { startH: sh, startM: sm, endH: eh, endM: em };
};

export const ScheduleService = {
  /** Lấy lịch dạy tổng hợp (dùng cho trang “Teaching Schedule” toàn hệ thống) */
  async getTeachingSchedule() {
    const classes = await ClassModel.find()
      .populate("teacherId", "name email")
      .lean<ClassDocLean[]>({ virtuals: true });

    const today = new Date();
    const subjectCache = new Map<string, { startDate?: Date; endDate?: Date } | null>();

    const formatted = await Promise.all(
      classes.map(async (cls) => {
        const teacherName =
          cls.teacherId?.name ?? cls.teacherName ?? cls.teacher ?? "Không xác định";

        let subjectInfo: { startDate?: Date; endDate?: Date } | null = null;

        if (cls.subject) {
          const cached = subjectCache.get(cls.subject);
          if (cached !== undefined) {
            subjectInfo = cached;
          } else {
            const s = await SubjectModel.findOne({ name: cls.subject })
              .select("startDate endDate")
              .lean<{ startDate?: Date; endDate?: Date } | null>();
            subjectInfo = s ? { startDate: s.startDate, endDate: s.endDate } : null;
            subjectCache.set(cls.subject, subjectInfo);
          }
        }

        const timeSlots =
          (cls.timeSlots ?? []).map((slot: TimeSlot) => {
            const key = (slot.day || "").trim().toLowerCase();
            const targetIdx = DAY_INDEX[key] ?? today.getDay();
            const classDate = nextDateFromDay(today, targetIdx);

            const start = subjectInfo?.startDate
              ? new Date(subjectInfo.startDate)
              : new Date(classDate);
            const end = subjectInfo?.endDate
              ? new Date(subjectInfo.endDate)
              : new Date(classDate);

            const { startH, startM, endH, endM } = parseSlot(slot.slot);
            start.setHours(startH, startM, 0, 0);
            end.setHours(endH, endM, 0, 0);

            return {
              day: slot.day,
              slot: slot.slot,
              start: start.toISOString(),
              end: end.toISOString(),
            };
          });

        return {
          className: cls.name ?? "Không xác định",
          teacher: teacherName,
          subject: cls.subject ?? "Không xác định",
          timeSlots,
        };
      })
    );

    return formatted;
  },

  /** Lấy lịch theo giáo viên đăng nhập */
  async getScheduleForTeacher(user?: User) {
    if (!user?._id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);
    return ClassModel.find({ teacherId: user._id })
      .select("_id name subject schedule room")
      .lean();
  },

  /** Cập nhật lịch dạy một lớp (chỉ admin hoặc giáo viên phụ trách) */
  async updateSchedule(params: { classId?: string; schedule?: string; user?: User }) {
    const { classId, schedule, user } = params;
    if (!user?._id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);
    if (!schedule?.trim()) throw new AppError("Thiếu dữ liệu (schedule)", HttpStatus.BAD_REQUEST);

    const oid = toOid(classId, "classId");
    const cls = await ClassModel.findById(oid).select("_id teacherId");
    if (!cls) throw new AppError("Lớp không tồn tại", HttpStatus.NOT_FOUND);

    const isAdmin = user.role === "admin";
    const isOwnerTeacher = String(cls.teacherId) === String(user._id);
    if (!isAdmin && !isOwnerTeacher) {
      throw new AppError("Không có quyền cập nhật lịch dạy", HttpStatus.FORBIDDEN);
    }

    const updated = await ClassModel.findByIdAndUpdate(
      oid,
      { $set: { schedule: schedule.trim() } },
      { new: true }
    ).lean();

    if (!updated) throw new AppError("Không tìm thấy lớp học để cập nhật", HttpStatus.NOT_FOUND);
    return updated;
  },
};
