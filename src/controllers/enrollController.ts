import { Request, Response } from "express";
import moment from "moment";
import Enrollment from "../models/Enrollment";
import Class from "../models/Class";
import { hasConflict } from "../utils/schedule";

type AuthReq = Request & { user?: { id?: string; role?: string } };

// ===== Helpers cho policy hủy =====
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

// ========== Controllers ==========
export const enrollClass = async (req: AuthReq, res: Response) => {
  try {
    const classId = req.params.classId || (req.body as any)?.classId;
    const studentId = req.user?.id;

    if (!classId) return res.status(400).json({ message: "Thiếu classId" });
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    const cls = await Class.findById(classId).lean();
    if (!cls) return res.status(404).json({ message: "Lớp không tồn tại" });

    // kiểm tra sĩ số: chỉ tính enrollment đã approved
    const currentCount = await Enrollment.countDocuments({ class: classId, status: "approved" });
    if (currentCount >= (cls.maxStudents || 1)) {
      return res.status(400).json({ message: "Lớp đã đầy" });
    }

    // kiểm tra trùng lịch với các lớp đã approved
    const enrolled = await Enrollment.find({ student: studentId, status: "approved" })
      .populate({ path: "class", select: "timeSlots" })
      .lean();

    const existingSlots = enrolled.flatMap((e: any) => e.class?.timeSlots || []);
    if (hasConflict(existingSlots, cls.timeSlots || [])) {
      return res.status(409).json({ message: "Trùng lịch với lớp đã đăng ký" });
    }

    // tạo bản ghi (mặc định approved, theo schema)
    await Enrollment.create({ student: studentId, class: classId, status: "approved" });
    return res.status(201).json({ message: "Đăng ký thành công" });
  } catch (e: any) {
    if (e?.code === 11000) {
      // unique index { student, class }
      return res.status(409).json({ message: "Bạn đã đăng ký lớp này" });
    }
    console.error("enrollClass error:", e);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const cancelEnrollment = async (req: AuthReq, res: Response) => {
  try {
    const classId = req.params.classId || (req.body as any)?.classId;
    const studentId = req.user?.id;

    if (!classId) return res.status(400).json({ message: "Thiếu classId" });
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    // Lấy enrollment + lớp để kiểm tra policy
    const enr = await Enrollment.findOne({ student: studentId, class: classId })
      .populate({ path: "class", select: "timeSlots name" });
    if (!enr) return res.status(404).json({ message: "Bạn chưa đăng ký lớp này" });

    const isAdmin = req.user?.role === "admin";
    const firstSession = getFirstSessionDate((enr as any).class?.timeSlots || []);

    // cutoffHours có thể cấu hình qua ENV, mặc định 24h
    const cutoffHours = Number(process.env.ENROLL_CANCEL_CUTOFF_HOURS ?? 24);

    if (!isAdmin && firstSession) {
      const cutoff = moment(firstSession).subtract(cutoffHours, "hours");
      if (moment().isAfter(cutoff)) {
        return res.status(409).json({
          message: `Không thể hủy: phải hủy tối thiểu ${cutoffHours} giờ trước buổi học đầu tiên`,
        });
      }
    }

    await enr.deleteOne();
    return res.json({ message: "Đã hủy đăng ký" });
  } catch (e) {
    console.error("cancelEnrollment error:", e);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const getStudentSchedule = async (req: AuthReq, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Thiếu studentId" });

    const enrolls = await Enrollment.find({ student: id, status: "approved" })
      .populate({ path: "class", select: "name subject teacher timeSlots" })
      .lean();

    const items = enrolls.map((e: any) => ({
      classId: e.class?._id?.toString(),
      className: e.class?.name,
      subject: e.class?.subject,
      teacher: e.class?.teacher,
      timeSlots: e.class?.timeSlots || [],
    }));

    return res.json(items);
  } catch (e) {
    console.error("getStudentSchedule error:", e);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
