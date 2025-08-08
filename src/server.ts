import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; 
import authRoutes from './routes/authRoutes'
import subjectRoutes from './routes/subjectRoutes';
import classRoutes from './routes/classRoutes';
import { v2 as cloudinary } from 'cloudinary';
import scheduleRoutes from './routes/scheduleRoutes';
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req: Request, res: Response) => {
  res.send('Hello Management');
});
app.use('/api/auth', authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/schedule", scheduleRoutes);
mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('✅ Connect DB success');
  })
  .catch((error) => {
    console.error('❌ Database connect error:', error);
  });

app.listen(port, () => {
  console.log(`🚀 Server is running on port: ${port}`);
});
