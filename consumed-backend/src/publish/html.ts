import type { EntryRow, Bucket } from "../sheets";
import { formatWeekPath } from "../utils/time";

export type WeekDigest = {
  year: number;
  week: number;
  entries: EntryRow[];
};

type DayGroup = Record<string, Record<Bucket, EntryRow[]>>; // YYYY-MM-DD -> bucket -> rows

export function groupByDayAndBucket(entries: EntryRow[]): DayGroup {
  const out: DayGroup = {} as DayGroup;
  for (const e of entries) {
    const day = e.date; // expected YYYY-MM-DD ET-local
    if (!out[day]) out[day] = { music: [], video: [], article: [], tweet: [], other: [] } as Record<Bucket, EntryRow[]>;
    // guard bucket
    const b = (e.bucket ?? "other") as Bucket;
    if (!out[day][b]) out[day][b] = [];
    out[day][b].push(e);
  }
  return out;
}

export function renderDigestHTML(d: WeekDigest): string {
  const weekPath = `${String(d.year)}-${String(d.week).padStart(2, "0")}`;
  const grouped = groupByDayAndBucket(d.entries);
  const days = weekDaysET(d); // Mon..Sun list of YYYY-MM-DD strings
  const esc = (s: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let body = "";
  for (const day of days) {
    const buckets = grouped[day];
    body += `<section class="day"><h2>${day}</h2>`;
    if (!buckets) {
      body += `<p class="empty">No entries</p>`;
    } else {
      for (const bucket of ["music", "video", "article", "tweet", "other"] as Bucket[]) {
        const list = buckets[bucket] || [];
        if (!list.length) continue;
        body += `<h3 class="bucket">${bucketLabel(bucket)}</h3><ul>`;
        for (const e of list) {
          const title = esc(e.title || e.url || "(untitled)");
          const url = esc(e.url || "#");
          const notes = esc(e.notes || "");
          body += `<li><a href="${url}" rel="noopener noreferrer">${title}</a>${notes ? ` — ${notes}` : ""}</li>`;
        }
        body += `</ul>`;
      }
    }
    body += `</section>`;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Media Consumed — Week ${weekPath}</title>
  <meta name="description" content="Weekly media consumed by Lawrence, grouped by day and bucket.">
  <link rel="stylesheet" href="/consumed/style.css">
</head>
<body>
  <header class="site-header">
    <h1>Media Consumed — Week ${weekPath}</h1>
  </header>
  <main class="container">
    ${body}
  </main>
</body>
</html>`;
}

function bucketLabel(b: Bucket): string {
  switch (b) {
    case "music":
      return "Music";
    case "video":
      return "Video";
    case "article":
      return "Articles";
    case "tweet":
      return "Tweets";
    default:
      return "Other";
  }
}

// Build the seven ET-local dates (YYYY-MM-DD) for the specified ISO week
function weekDaysET(d: WeekDigest): string[] {
  const monday = isoWeekToDateET(d.year, d.week); // Date at Monday 00:00 ET
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(monday.getTime());
    dt.setDate(dt.getDate() + i);
    out.push(dt.toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
  }
  return out;
}

function isoWeekToDateET(year: number, week: number): Date {
  // Start from Jan 4th, which is always in week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7; // 1..7
  const mondayUTC = new Date(jan4);
  mondayUTC.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  // Convert to ET-local wall time for midnight of that day
  const etString = mondayUTC.toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(etString);
}

