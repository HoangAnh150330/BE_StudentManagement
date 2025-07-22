import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; 
import authRoutes from './routes/authRoutes'
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req: Request, res: Response) => {
  res.send('Hello Management');
});
app.use('/api/auth', authRoutes);
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
