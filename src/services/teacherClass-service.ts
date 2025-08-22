// services/teacherClass-service.ts
import { Types } from "mongoose";
import ClassModel from "../models/Class";
import EnrollmentModel from "../models/Enrollment";
import UserModel from "../models/UserModels";
import { AppError, HttpStatus } from "../utils/http";

type Role = "admin" | "teacher" | "student";
type UserCtx = { _id?: string; id?: string; role?: Role };

const toMaybeOid = (v?: any) =>
  v && Types.ObjectId.isValid(String(v)) ? new Types.ObjectId(String(v)) : null;

const needAuth = (user?: UserCtx) => {
  const uid = user?.id || user?._id;
  if (!uid) throw new AppError("Không xác thực", HttpStatus.UNAUTHORIZED);
  return String(uid);
};

export const TeacherClassService = {
  /** Lấy danh sách lớp của giáo viên đăng nhập */
  async getMyClasses(user?: UserCtx) {
    const uid = needAuth(user);
    const docs = await ClassModel.find({ teacherId: new Types.ObjectId(uid) })
      .select("_id name subject timeSlots maxStudents room createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return docs;
  },

  /** Lấy học viên trong lớp (chấp nhận id ở nhiều dạng) */
  async getClassStudents(classId?: string) {
    const idParam = String(classId || "");
    if (!idParam) throw new AppError("classId không hợp lệ", HttpStatus.BAD_REQUEST);
    const oid = toMaybeOid(idParam);

    const enrolls = await EnrollmentModel.find({
      $or: [
        { class: oid },
        { class: idParam },
        { classId: oid },
        { classId: idParam },
      ],
    })
      .select("student studentId")
      .lean();

    const rawIds = enrolls.map((e: any) => e.studentId ?? e.student).filter(Boolean);
    if (rawIds.length === 0) return [];

    const asObjectIds = rawIds.map((v) => toMaybeOid(v)).filter(Boolean) as Types.ObjectId[];
    const asStrings = rawIds.map(String);

    const students = await UserModel.find({
      $or: [{ _id: { $in: asObjectIds } }, { _id: { $in: asStrings } }],
    })
      .select("_id name email")
      .lean();

    return students;
  },

  /** Xuất CSV danh sách học viên */
  async getClassStudentsCSV(classId?: string) {
    const students = await this.getClassStudents(classId);

    // CSV rất cơ bản; nếu cần an toàn dấu phẩy/xuống dòng, hãy bao field bằng dấu ngoặc kép và escape " -> "".
    const esc = (v: any) => {
      const s = (v ?? "").toString();
      const needsQuote = /[",\n]/.test(s);
      const t = s.replace(/"/g, '""');
      return needsQuote ? `"${t}"` : t;
    };

    const header = "name,email";
    const rows = students.map((s: any) => `${esc(s.name)},${esc(s.email)}`);
    const csv = [header, ...rows].join("\n");
    return { filename: `students_${classId}.csv`, csv };
  },

  /** Lịch dạy giáo viên (nhẹ hơn getMyClasses) */
  async getTeacherSchedule(user?: UserCtx) {
    const uid = needAuth(user);
    const docs = await ClassModel.find({ teacherId: new Types.ObjectId(uid) })
      .select("_id name subject timeSlots room")
      .lean();
    return docs;
  },
};
