// src/middleware/errorMiddleware.ts
import type { Request, Response, NextFunction } from "express";
import { AppError, HttpStatus } from "../utils/http";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}), // tránh trả "details: undefined"
    });
  }

  // Log server error để debug
  console.error("[Unhandled Error]", err);

  // Có thể ẩn message thật ở prod, tuỳ bạn
  return res.status(HttpStatus.INTERNAL).json({
    success: false,
    message: "Lỗi máy chủ",
  });
}
