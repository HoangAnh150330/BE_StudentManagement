// services/enrollment-service.ts
import moment from "moment";
import Enrollment from "../models/Enrollment";
import Class from "../models/Class";
import { hasConflict } from "../utils/schedule";
import { AppError, HttpStatus } from "../utils/http";

/* ===== Helpers cho policy hủy ===== */
const dayMap: Record<string, number> = {
  "Chủ nhật": 0,
  "Thứ 2": 1,
  "Thứ 3": 2,
  "Thứ 4": 3,
  "Thứ 5": 4,
  "Thứ 6": 5,
  "Thứ 7": 6,
};

function parseSlot(slot: string) {
  const [a, b] = slot.split("-");
  const [sh, sm] = a.split(":").map(Number);
  const [eh, em] = b.split(":").map(Number);
  return { sh, sm, eh, em };
}

function getFirstSessionDate(timeSlots: any[]): Date | null {
  const candidates: Date[] = [];

  for (const ts of timeSlots || []) {
    if (!ts?.day || !ts?.slot) continue;
    const dow = dayMap[ts.day];
    if (dow === undefined) continue;

    const { sh, sm } = parseSlot(ts.slot);

    if (ts.start) {
      let d = moment(ts.start).day(dow).hour(sh).minute(sm).second(0).millisecond(0);
      if (d.isBefore(moment(ts.start))) d = d.add(7, "days");
      candidates.push(d.toDate());
    } else {
      let d = moment().startOf("week").day(dow).hour(sh).minute(sm).second(0).millisecond(0);
      if (d.isBefore(moment())) d = d.add(7, "days");
      candidates.push(d.toDate());
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0];
}

type UserCtx = { _id?: string; role?: string };

export const EnrollmentService = {
  /** Đăng ký lớp (chặn lớp đầy & trùng lịch với lớp đã approved) */
  async enroll(params: { classId?: string; user?: UserCtx }) {
    const { classId, user } = params;

    if (!classId) throw new AppError("Thiếu classId", HttpStatus.BAD_REQUEST);
    if (!user || !user._id) throw new AppError("Thông tin người dùng không hợp lệ", HttpStatus.UNAUTHORIZED);  // Dùng _id

    console.log("Service enroll: user._id =", user._id, "classId =", classId);  // Log để debug

    const cls = await Class.findById(classId).lean();
    if (!cls) {
      console.log("Class not found for ID:", classId);  // Log
      throw new AppError("Lớp không tồn tại", HttpStatus.NOT_FOUND);
    }
    console.log("Class found:", cls.name || cls._id);  // Log

    const currentCount = await Enrollment.countDocuments({ class: classId, status: "approved" });
    if (currentCount >= (cls.maxStudents || 1)) {
      throw new AppError("Lớp đã đầy", HttpStatus.CONFLICT);
    }

    const enrolled = await Enrollment.find({ student: user._id, status: "approved" })  // Dùng _id
      .populate({ path: "class", select: "timeSlots" })
      .lean();

    const existingSlots = enrolled.flatMap((e: any) => e.class?.timeSlots || []);
    if (hasConflict(existingSlots, cls.timeSlots || [])) {
      throw new AppError("Trùng lịch với lớp đã đăng ký", HttpStatus.CONFLICT);
    }

    try {
      await Enrollment.create({ student: user._id, class: classId, status: "approved" });  // Dùng _id
    } catch (e: any) {
      console.error("Create enrollment error:", e);  // Log
      if (e?.code === 11000) {
        throw new AppError("Bạn đã đăng ký lớp này", HttpStatus.CONFLICT);
      }
      throw e;
    }

    return { message: "Đăng ký thành công" };
  },
  /** Hủy đăng ký (policy: trước buổi đầu N giờ, trừ admin) */
  async cancel(params: { classId?: string; user?: UserCtx }) {
    const { classId, user } = params;

    if (!classId) throw new AppError("Thiếu classId", HttpStatus.BAD_REQUEST);
    if (!user || !user._id) throw new AppError("Thông tin người dùng không hợp lệ", HttpStatus.UNAUTHORIZED);

    const enr = await Enrollment.findOne({ student: user._id, class: classId })
      .populate({ path: "class", select: "timeSlots name" });
    if (!enr) throw new AppError("Bạn chưa đăng ký lớp này", HttpStatus.NOT_FOUND);

    const isAdmin = user.role === "admin";
    const firstSession = getFirstSessionDate((enr as any).class?.timeSlots || []);

    const cutoffHours = Number(process.env.ENROLL_CANCEL_CUTOFF_HOURS ?? 24);

    if (!isAdmin && firstSession) {
      const cutoff = moment(firstSession).subtract(cutoffHours, "hours");
      console.log("First session:", moment(firstSession).format(), "Cutoff:", cutoff.format(), "Now:", moment().format());
      if (moment().isAfter(cutoff)) {
        throw new AppError(
          `Không thể hủy: phải hủy tối thiểu ${cutoffHours} giờ trước buổi học đầu tiên`,
          HttpStatus.CONFLICT
        );
      }
    }

    await enr.deleteOne();
    return { message: "Đã hủy đăng ký" };
  },

  /** Lấy thời khóa biểu của 1 sinh viên (chỉ lớp approved) */
  async getStudentSchedule(studentId?: string) {
    // if (!studentId) throw new AppError("Thiếu studentId", HttpStatus.BAD_REQUEST);

    const enrolls = await Enrollment.find({ student: studentId, status: "approved" })
      .populate({ path: "class", select: "name subject teacher timeSlots" })
      .lean();

    const items = enrolls.map((e: any) => ({
      classId: e.class?._id?.toString(),
      className: e.class?.name,
      subject: e.class?.subject,
      teacher: e.class?.teacher,
      timeSlots: e.class?.timeSlots || [],
    }));

    return items;
  },

  /** Lấy danh sách classId mà 1 sinh viên đã đăng ký (để dùng cho announcement) */
  async getStudentClassIds(studentId?: string): Promise<string[]> {
  console.log("Fetching classIds for studentId:", studentId);
  const enrolls = await Enrollment.find({ student: studentId, status: "approved" })
    .select("class")
    .lean();
  console.log("Enrollments found:", enrolls);
  const classIds = enrolls.map((e) => e.class.toString());
  console.log("ClassIds retrieved:", classIds);
  return classIds;
}
};
