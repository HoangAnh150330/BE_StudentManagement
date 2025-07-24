import express from 'express';
import { register, login, verifyOTP,resendOTP,
  getAllStudents,updateStudent ,deleteStudent,getUserProfile } from '../controllers/authController';
import { authMiddleware } from '../middleware/authmiddleware';
const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/resend-otp', resendOTP);
router.get('/getall-student', getAllStudents);
router.put('/update-student/:id',updateStudent);
router.delete('/delete-student/:id', deleteStudent);
router.get('/user/:id', getUserProfile);
export default router;
