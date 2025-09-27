import type { RequestHandler } from "express";
import jwt, { type JwtPayload, TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
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
  if (!raw) {
    console.log("No authorization header provided");
    return res.status(401).json({ message: "No token provided" });
  }

  const token = raw.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
  if (!token) {
    console.log("No valid token extracted from header:", raw);
    return res.status(401).json({ message: "No token provided" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not defined in environment variables");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    console.log("Verifying token with secret:", secret.substring(0, 5) + "..."); // Log một phần secret để debug
    const decoded = jwt.verify(token, secret) as TokenPayload;
    console.log("Decoded payload:", decoded);

    const id = decoded._id || decoded.id || (decoded as any).userId;
    const role = decoded.role as Role | undefined;
    const email = typeof decoded.email === "string" ? decoded.email : undefined;

    if (!id || !role) {
      console.log("Invalid token payload, missing id or role:", { id, role });
      return res.status(401).json({ message: "Invalid token payload" });
    }

    req.user = { _id: id, email, role, name: decoded.name } as ReqUser;
    console.log("Successfully attached req.user:", req.user);
    next();
  } catch (err: any) {
    console.error("Token verification error:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    } else if (err instanceof JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    } else {
      return res.status(401).json({ message: "Authentication failed" });
    }
  }
};

// Optional: giới hạn vai trò
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      console.log("No role found in req.user");
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!roles.includes(role)) {
      console.log("Forbidden role:", role, "required:", roles);
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };