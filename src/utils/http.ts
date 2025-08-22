// src/utils/http.ts
import type { Response } from "express";

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,

  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,

  INTERNAL = 500, // 👈 để dùng HttpStatus.INTERNAL
}

export class AppError extends Error {
  status: HttpStatus;
  details?: unknown;
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const ok = <T>(res: Response, data: T, status: HttpStatus = HttpStatus.OK) =>
  res.status(status).json({ success: true, data });

export const fail = (res: Response, error: unknown, fallback = "Internal Server Error") => {
  const status = error instanceof AppError ? error.status : HttpStatus.INTERNAL;
  const message = error instanceof Error ? (error.message || fallback) : fallback;
  return res.status(status).json({ success: false, message });
};
