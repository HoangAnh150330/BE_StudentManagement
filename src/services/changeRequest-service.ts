import { Types } from "mongoose";
import ChangeRequest from "../models/ChangeRequest_Models";
import ClassModel from "../models/Class";
import { AppError, HttpStatus } from "../utils/http";

type Role = "admin" | "teacher" | "student";
type User = { _id?: string; role?: Role };
type Slot = { day: string; slot: string };

function needAuth(user?: User) {
  const id = user?._id;
  if (!id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);
  return id;
}
function ensureTeacher(user?: User) {
  if (!user?._id) throw new AppError("Unauthorized", HttpStatus.UNAUTHORIZED);
  if (user.role !== "teacher" && user.role !== "admin") {
    throw new AppError("Forbidden", HttpStatus.FORBIDDEN);
  }
}
const isHHmm = (v?: string) => !!v && /^\d{2}:\d{2}$/.test(v);
const isSlot = (v?: string) => !!v && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(v);

function conflict(newSlots: Slot[], otherSlots: Slot[]) {
  const key = (d: string, s: string) => `${d}__${s}`;
  const set = new Set(otherSlots.map(t => key(t.day, t.slot)));
  return newSlots.some(t => set.has(key(t.day, t.slot)));
}

export const ChangeRequestService = {
  async create({ user, payload }: {
    user?: User, payload: {
      classId: string; date?: string; startTime?: string; endTime?: string; reason?: string; newSlots?: Slot[];
    }
  }) {
    ensureTeacher(user);
    const teacherId = needAuth(user);

    const cls = await ClassModel.findById(payload.classId).select("_id teacherId timeSlots").lean();
    if (!cls) throw new AppError("Lớp không tồn tại", HttpStatus.NOT_FOUND);
    if (String(cls.teacherId) !== String(teacherId)) {
      throw new AppError("Bạn không phụ trách lớp này", HttpStatus.FORBIDDEN);
    }

    let newSlots: Slot[] = [];
    if (Array.isArray(payload.newSlots) && payload.newSlots.length) {
      newSlots = payload.newSlots;
      newSlots.forEach(s => {
        if (!s?.day || !isSlot(s.slot)) throw new AppError("newSlots không hợp lệ", HttpStatus.BAD_REQUEST);
      });
    } else {
      if (!payload.date || !isHHmm(payload.startTime) || !isHHmm(payload.endTime)) {
        throw new AppError("Thiếu/sai date/startTime/endTime", HttpStatus.BAD_REQUEST);
      }
      const d = new Date(payload.date + "T00:00:00.000Z");
      const dayNames = ["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
      const day = dayNames[d.getUTCDay()];
      newSlots = [{ day, slot: `${payload.startTime}-${payload.endTime}` }];
    }

    const others = await ClassModel.find({ teacherId, _id: { $ne: cls._id } }).select("timeSlots").lean();
    const otherSlots = others.flatMap(o => (o.timeSlots ?? []) as Slot[]);
    if (conflict(newSlots, otherSlots)) {
      throw new AppError("Khung giờ đề xuất trùng lớp khác của bạn", HttpStatus.CONFLICT);
    }

    const cr = await ChangeRequest.create({
      classId: new Types.ObjectId(String(cls._id)),
      teacherId: new Types.ObjectId(String(teacherId)),
      oldSlots: (cls.timeSlots ?? []) as Slot[],
      newSlots,
      reason: payload.reason ?? "",
      status: "pending",
    });

    return cr.toObject();
  },

  async listMine(user?: User) {
    const teacherId = needAuth(user);
    return ChangeRequest.find({ teacherId })
      .populate("classId", "name subject")
      .sort({ createdAt: -1 }).lean();
  },

  async listAll() {
    return ChangeRequest.find()
      .populate("classId", "name subject")
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 }).lean();
  },

  async review({ id, action, note, reviewer }: { id: string; action: "approve" | "reject"; note?: string; reviewer?: User }) {
    if (!id || !Types.ObjectId.isValid(id)) throw new AppError("id không hợp lệ", HttpStatus.BAD_REQUEST);
    const cr = await ChangeRequest.findById(id);
    if (!cr) throw new AppError("Không tìm thấy đề xuất", HttpStatus.NOT_FOUND);
    if (cr.status !== "pending") throw new AppError("Đề xuất đã xử lý", HttpStatus.BAD_REQUEST);

    if (action === "reject") {
      cr.status = "rejected";
      cr.set("note", note ?? "");
      cr.set("reviewedBy", reviewer?._id ? new Types.ObjectId(String(reviewer._id)) : undefined);
      cr.set("reviewedAt", new Date());
      await cr.save();
      return cr.toObject();
    }

    const updated = await ClassModel.findByIdAndUpdate(cr.classId, { $set: { timeSlots: cr.newSlots } }, { new: true }).lean();
    if (!updated) throw new AppError("Không cập nhật được lớp", HttpStatus.INTERNAL_SERVER_ERROR);

    cr.status = "approved";
    cr.set("reviewedBy", reviewer?._id ? new Types.ObjectId(String(reviewer._id)) : undefined);
    cr.set("reviewedAt", new Date());
    await cr.save();
    return cr.toObject();
  },
};
