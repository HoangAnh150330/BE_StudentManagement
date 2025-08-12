const dayMap: Record<string, number> = {
  "Chủ nhật": 0, "Thứ 2": 1, "Thứ 3": 2, "Thứ 4": 3, "Thứ 5": 4, "Thứ 6": 5, "Thứ 7": 6,
};

function parseSlot(slot: string) {
  const [a, b] = slot.split("-");
  const [sh, sm] = a.split(":").map(Number);
  const [eh, em] = b.split(":").map(Number);
  return { sh, sm, eh, em };
}
function overlap(a: {sh:number,sm:number,eh:number,em:number}, b: {sh:number,sm:number,eh:number,em:number}) {
  const s1 = a.sh*60 + a.sm, e1 = a.eh*60 + a.em;
  const s2 = b.sh*60 + b.sm, e2 = b.eh*60 + b.em;
  return Math.max(s1, s2) < Math.min(e1, e2);
}
export function hasConflict(existing: {day:string;slot:string}[], candidate: {day:string;slot:string}[]) {
  for (const e of existing) {
    for (const c of candidate) {
      if (dayMap[e.day] !== dayMap[c.day]) continue;
      if (overlap(parseSlot(e.slot), parseSlot(c.slot))) return true;
    }
  }
  return false;
}
