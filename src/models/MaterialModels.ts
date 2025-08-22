import { Schema, model, Types, Document } from "mongoose";

export interface MaterialDoc extends Document {
  classId: Types.ObjectId;
  name: string;
  url: string;
  size?: string;
  mimeType?: string;
  uploaderId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<MaterialDoc>(
  {
    classId:    { type: Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    name:       { type: String, required: true, trim: true },
    url:        { type: String, required: true },
    size:       { type: String },
    mimeType:   { type: String },
    uploaderId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

materialSchema.index({ classId: 1, createdAt: -1 });

const MaterialModel = model<MaterialDoc>("Material", materialSchema);
export default MaterialModel;
