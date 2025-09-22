export function nowInNY(): Date {
  // America/New_York offset including DST
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    // @ts-ignore
    fmt.formatToParts(new Date()).map(p => [p.type, p.value])
  );
  const str = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}-05:00`;
  // Offset is not always -05:00 (DST). Use Date.toLocaleString with timeZone to extract local components
  // then construct a date in that local wall time by parsing and adjusting with the current NY offset.
  const ny = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  return ny;
}

export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday in current week decides the year
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

export function formatWeekPath(date: Date): string {
  const { year, week } = isoWeek(date);
  const ww = String(week).padStart(2, "0");
  return `${year}-${ww}`;
}

