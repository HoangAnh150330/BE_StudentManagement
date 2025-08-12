import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const raw = req.headers.authorization as string | undefined;
  console.log("Auth header =", raw);
  console.log("JWT_SECRET set =", !!process.env.JWT_SECRET);

  if (!raw) return res.status(401).json({ message: "No token provided" });

  // lấy phần sau 'Bearer', bỏ ngoặc kép & khoảng trắng
  const token = raw.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload & { id?: string; role?: string };
    (req as any).user = { id: decoded.id, role: decoded.role };
    return next();
  } catch (err: any) {
    console.error("JWT verify error:", err?.name, err?.message);
    return res.status(401).json({ message: err?.name === "TokenExpiredError" ? "Token expired" : "Invalid token" });
  }
};
