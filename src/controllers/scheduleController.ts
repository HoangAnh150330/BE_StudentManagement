import { Request, Response } from "express";
import ClassModel, { IClass } from "../models/Class";
import SubjectModel from "../models/Subject"; // Giả sử bạn có mô hình Subject

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getTeachingSchedule = async (req: Request, res: Response) => {
  try {
    const classes: IClass[] = await ClassModel.find();

    const today = new Date("2025-08-07T23:33:00+07:00");

    const formattedData = await Promise.all(classes.map(async (cls) => {
      // Lấy thông tin subject dựa trên subject hoặc một trường subjectId
      const subject = await SubjectModel.findOne({ name: cls.subject }); // Hoặc dùng _id nếu có

      const timeSlots = cls.timeSlots?.map((slot) => {
        const targetDayOffset = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(slot.day.slice(0, 3).toLowerCase());
        const todayDayOffset = today.getDay();
        const dateOffset = (targetDayOffset - todayDayOffset + 7) % 7;
        const classDate = new Date(today);
        classDate.setDate(today.getDate() + dateOffset);

        // Lấy start và end từ subject nếu có, nếu không dùng giá trị mặc định
        const start = subject?.startDate ? new Date(subject.startDate) : new Date(classDate);
        const end = subject?.endDate ? new Date(subject.endDate) : new Date(classDate); // Cần thêm endDate trong SubjectModel

        start.setHours(parseInt(slot.slot.split("-")[0].split(":")[0]), parseInt(slot.slot.split("-")[0].split(":")[1]));
        end.setHours(parseInt(slot.slot.split("-")[1].split(":")[0]), parseInt(slot.slot.split("-")[1].split(":")[1]));

        return {
          day: slot.day,
          slot: slot.slot,
          start: start.toISOString(),
          end: end.toISOString()
        };
      }) || [];

      return {
        className: cls.name || "Không xác định",
        teacher: cls.teacher || "Không xác định",
        subject: cls.subject || "Không xác định",
        timeSlots: timeSlots,
      };
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Lỗi trong getTeachingSchedule:", error);
    res.status(500).json({ message: "Lỗi khi lấy lịch giảng dạy", error: error.message });
  }
};

export default getTeachingSchedule;