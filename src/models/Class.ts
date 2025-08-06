import mongoose, { Schema, Document } from "mongoose";

export interface IClass extends Document {
  name: string;
  course: string;
  teacher: string;
}

const ClassSchema = new Schema<IClass>(
  {
    name: { type: String, required: true },
    course: { type: String, required: true },
    teacher: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IClass>("Class", ClassSchema);
// chuẩn bị step 2 
// thiết lập CI/CD cho BE 
// Vẽ Diagram của structure DB 
// Học thuộc 
// Hiểu rõ hook , react hook , dùng react version , node module , yarn , ..... package json , packagelog json
// quản lý form 
// thêm boostrap tailwind 
// state management trong react là j 
// tại sao lại schema , interface extend ngoài extend có j nữa k 
// chưa require 
// cách validate trong form 
// upload ảnh , cloudinary xem coi còn dùng j thêm kh 
// social login : FB , GG , 
// SSO login là j ? 