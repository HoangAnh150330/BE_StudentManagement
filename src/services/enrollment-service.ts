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

/**
 * Lấy thời điểm "buổi học đầu tiên" dựa trên timeSlots.
 * - Nếu timeSlot có start => dùng tuần của start, nhảy đến đúng thứ + giờ; nếu vẫn trước start => +7 ngày.
 * - Nếu không có start => suy theo tuần hiện tại; nếu đã qua => +7 ngày.
 */
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

type UserCtx = { id?: string; role?: string };

export const EnrollmentService = {
  /** Đăng ký lớp (chặn lớp đầy & trùng lịch với lớp đã approved) */
  async enroll(params: { classId?: string; user?: UserCtx }) {
    const { classId, user } = params;

    if (!classId) throw new AppError("Thiếu classId", HttpStatus.BAD_REQUEST);
    if (!user?.id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);

    const cls = await Class.findById(classId).lean();
    if (!cls) throw new AppError("Lớp không tồn tại", HttpStatus.NOT_FOUND);

    // kiểm tra sĩ số: chỉ tính enrollment đã approved
    const currentCount = await Enrollment.countDocuments({ class: classId, status: "approved" });
    if (currentCount >= (cls.maxStudents || 1)) {
      throw new AppError("Lớp đã đầy", HttpStatus.CONFLICT);
    }

    // kiểm tra trùng lịch với các lớp đã approved
    const enrolled = await Enrollment.find({ student: user.id, status: "approved" })
      .populate({ path: "class", select: "timeSlots" })
      .lean();

    const existingSlots = enrolled.flatMap((e: any) => e.class?.timeSlots || []);
    if (hasConflict(existingSlots, cls.timeSlots || [])) {
      throw new AppError("Trùng lịch với lớp đã đăng ký", HttpStatus.CONFLICT);
    }

    // tạo bản ghi (mặc định approved, theo schema)
    try {
      await Enrollment.create({ student: user.id, class: classId, status: "approved" });
    } catch (e: any) {
      // Chuẩn hoá duplicate key thành 409 để controller có thể trả fail chuẩn
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
    if (!user?.id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);

    // Lấy enrollment + lớp để kiểm tra policy
    const enr = await Enrollment.findOne({ student: user.id, class: classId })
      .populate({ path: "class", select: "timeSlots name" });
    if (!enr) throw new AppError("Bạn chưa đăng ký lớp này", HttpStatus.NOT_FOUND);

    const isAdmin = user.role === "admin";
    const firstSession = getFirstSessionDate((enr as any).class?.timeSlots || []);

    // cutoffHours có thể cấu hình qua ENV, mặc định 24h
    const cutoffHours = Number(process.env.ENROLL_CANCEL_CUTOFF_HOURS ?? 24);

    if (!isAdmin && firstSession) {
      const cutoff = moment(firstSession).subtract(cutoffHours, "hours");
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
    if (!studentId) throw new AppError("Thiếu studentId", HttpStatus.BAD_REQUEST);

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
};
