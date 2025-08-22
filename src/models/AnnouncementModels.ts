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
//
const announcementSchema = new Schema<AnnouncementDoc>(
  {
    // ✅ phải dùng Schema.Types.ObjectId cho "type"
    classId:   { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    title:     { type: String, required: true, trim: true },
    content:   { type: String },
    creatorId: { type: Schema.Types.ObjectId, ref: "User" },
    pinned:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

announcementSchema.index({ classId: 1, createdAt: -1 });

const AnnouncementModel = model<AnnouncementDoc>("Announcement", announcementSchema);
export default AnnouncementModel;
