// src/types/express.d.ts
import type { Request } from "express";

export type Role = "student" | "teacher" | "admin";

export interface ReqUser {
  _id: string;
  email: string;        // <-- bắt buộc là string
  role: Role;
  name?: string;
}

// Merge vào Express.Request
declare module "express-serve-static-core" {
  interface Request {
    user?: ReqUser;
  }
}

// Kiểu req sau khi đã xác thực (có chắc user)
export type AuthRequest = Request & { user: ReqUser };
