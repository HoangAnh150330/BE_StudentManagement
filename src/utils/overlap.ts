// So sánh giờ "HH:mm" -> phút
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const isRangeOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  const s1 = toMinutes(aStart), e1 = toMinutes(aEnd);
  const s2 = toMinutes(bStart), e2 = toMinutes(bEnd);
  return s1 < e2 && s2 < e1; // chạm biên (10:00-11:00 & 11:00-12:00) KHÔNG trùng
};

export type Slot = { dayOfWeek: number; start: string; end: string; classId?: string; name?: string };

// "Thứ x" -> number
const dayMap: Record<string, number> = {
  "thứ 2": 1, "thu 2": 1,
  "thứ 3": 2, "thu 3": 2,
  "thứ 4": 3, "thu 4": 3,
  "thứ 5": 4, "thu 5": 4,
  "thứ 6": 5, "thu 6": 5,
  "thứ 7": 6, "thu 7": 6,
  "chủ nhật": 7, "chu nhat": 7,
};

// Chuẩn hoá 1 record {day, slot:"HH:mm-HH:mm"} => Slot
export const normalizeOne = (item: { day: string; slot: string }): Slot => {
  const key = (item.day || "").trim().toLowerCase();
  const dayOfWeek = dayMap[key];
  const [start, end] = String(item.slot).split("-");
  return {
    dayOfWeek,
    start: start.trim(),
    end: end.trim(),
  };
};

// Tìm overlap giữa 2 list Slot
export const findConflicts = (incoming: Slot[], existing: Slot[]) => {
  const conflicts: { dayOfWeek: number; a: Slot; b: Slot }[] = [];
  for (const a of incoming) {
    for (const b of existing) {
      if (!a.dayOfWeek || !b.dayOfWeek) continue;
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (isRangeOverlap(a.start, a.end, b.start, b.end)) {
        conflicts.push({ dayOfWeek: a.dayOfWeek, a, b });
      }
    }
  }
  return conflicts;
};
