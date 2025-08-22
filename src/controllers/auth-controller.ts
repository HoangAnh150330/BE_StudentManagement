// controllers/auth.controller.ts
import type { Request, Response } from "express";
import { AuthService } from "../services/auth-service";
import { ok, fail, AppError, HttpStatus } from "../utils/http";

type ReqUser = { id?: string; _id?: string; role?: "admin" | "teacher" | "student" };
type AuthRequest = Request & { user?: ReqUser };

/** POST /auth/register */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body ?? {};
    if (!name || !email || !password) {
      throw new AppError("Thiếu name/email/password", HttpStatus.BAD_REQUEST);
    }
    const data = await AuthService.register({ name, email, password, role });
    return ok(res, data, HttpStatus.CREATED);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};

/** POST /auth/resend-otp */
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body ?? {};
    if (!email) throw new AppError("Thiếu email", HttpStatus.BAD_REQUEST);
    const data = await AuthService.resendOTP({ email });
    return ok(res, data);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};

/** POST /auth/verify-otp */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body ?? {};
    if (!email || !otp) throw new AppError("Thiếu email/otp", HttpStatus.BAD_REQUEST);
    const data = await AuthService.verifyOTP({ email, otp });
    return ok(res, data);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};

/** POST /auth/login */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) throw new AppError("Thiếu email/password", HttpStatus.BAD_REQUEST);
    const data = await AuthService.login({ email, password });
    return ok(res, data);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};

/** POST /auth/facebook */
export const facebookLogin = async (req: Request, res: Response) => {
  try {
    const { facebookId, email, name } = req.body ?? {};
    const data = await AuthService.facebookLogin({ facebookId, email, name });
    return ok(res, data);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};

/** PUT /auth/change-password  (hoặc /students/:id/change-password) */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const paramId = req.params.id; // có thể không có
    const authId = (req.user?._id as string) || (req.user?.id as string) || undefined;
    const { currentPassword, newPassword } = req.body ?? {};

    const data = await AuthService.changePassword({
      targetUserId: paramId,
      authUserId: authId,
      currentPassword,
      newPassword,
    });

    return ok(res, data);
  } catch (e) {
    return fail(res, e, "Lỗi server");
  }
};
