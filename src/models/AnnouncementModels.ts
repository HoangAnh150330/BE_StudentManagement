import { Schema, model, Types, Document } from "mongoose";

export interface AnnouncementDoc extends Document {
  classId: Types.ObjectId;
  title: string;
  content?: string;
  creatorId?: Types.ObjectId;
  pinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<AnnouncementDoc>(
  {
    // ✅ Đã đúng: ref "Class" để populate tên lớp
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String }, // Có thể thêm required nếu bắt buộc
    creatorId: { type: Schema.Types.ObjectId, ref: "User" }, // Có thể thêm required nếu cần
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Index cho query hiệu quả (classId + createdAt cho sort)
announcementSchema.index({ classId: 1, createdAt: -1 });

// ✅ Tùy chọn: Index cho pinned thông báo
announcementSchema.index({ pinned: 1, createdAt: -1 });

const AnnouncementModel = model<AnnouncementDoc>("Announcement", announcementSchema);
export default AnnouncementModel;