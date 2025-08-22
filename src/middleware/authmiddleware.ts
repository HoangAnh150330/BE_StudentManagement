import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Role, ReqUser } from "../types/express"; // chỉ để dùng type

type TokenPayload = JwtPayload & {
  id?: string;          // có nơi dùng id
  _id?: string;         // có nơi dùng _id
  email?: string;
  role?: Role;
  name?: string;
};

export const authMiddleware: RequestHandler = (req, res, next) => {
  const raw = req.headers.authorization;
  if (!raw) return res.status(401).json({ message: "No token provided" });

  const token = raw.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not configured");

    const decoded = jwt.verify(token, secret) as TokenPayload;

    const id = decoded._id || decoded.id;
    const email = decoded.email;
    const role = decoded.role;

    // đảm bảo đúng shape ReqUser
    if (!id || !email || !role) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    req.user = { _id: id, email, role, name: decoded.name } as ReqUser;
    next();
  } catch (err: any) {
    return res.status(401).json({
      message: err?.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
    });
  }
};

// Optional: giới hạn vai trò
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
