import { Router } from "express";
import {
  register,
  login,
  verifyOTP,
  resendOTP,
  facebookLogin,
  changePassword,
} from "../controllers/authController";
import { authMiddleware } from "../middleware/authmiddleware";

const router = Router();

// ===== Auth & OTP =====
router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/resend-otp", resendOTP);
router.post("/facebook-login", facebookLogin);

// ===== Change Password =====
// Giữ endpoint dạng có :id (khớp FE hiện tại)
router.put("/students/:id/change-password", authMiddleware, changePassword);


export default router;
