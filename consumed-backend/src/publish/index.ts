import type { Env, EntryRow } from "../sheets";
import { renderDigestHTML } from "./html";
import { commitFilesToGitHub } from "./github";

export async function publishWeek(env: Env & { GITHUB_TOKEN?: string }, year: number, week: number, rows: EntryRow[]) {
  const html = renderDigestHTML({ year, week, entries: rows });
  const ww = String(week).padStart(2, "0");
  // Build/refresh index page by listing existing weeks in the repo and adding this one
  const weeks = await listWeeksFromRepo(env);
  if (!weeks.includes(`${year}-${ww}`)) weeks.push(`${year}-${ww}`);
  const weeksSorted = weeks.filter(x => /^\d{4}-\d{2}$/.test(x)).sort((a,b) => b.localeCompare(a));
  const indexHtml = renderIndexHTML(weeksSorted);
  const files = [
    { path: `public/consumed/${year}-${ww}/index.html`, content: html },
    { path: `public/consumed/index.html`, content: indexHtml },
  ];
  const res = await commitFilesToGitHub(env, `Publish consumed week ${year}-${ww}`, files);
  return res;
}

async function listWeeksFromRepo(env: Env & { GITHUB_TOKEN?: string }): Promise<string[]> {
  const token = env.GITHUB_TOKEN;
  if (!token) return [];
  const [owner, repo] = env.PUBLIC_REPO.split("/");
  const branch = env.PUBLIC_REPO_BRANCH || "main";
  const api = `https://api.github.com/repos/${owner}/${repo}/contents/public/consumed?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(api, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "consumed-backend" } });
  if (!res.ok) return [];
  const json: any[] = await res.json();
  const dirs = json.filter(x => x.type === "dir").map(x => x.name as string);
  return dirs;
}

function renderIndexHTML(weeks: string[]): string {
  const items = weeks.map(w => `<li><a href="/consumed/${w}/">Week ${w}</a></li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Media Consumed — Index</title>
  <link rel="stylesheet" href="/consumed/style.css">
</head>
<body>
  <header class="site-header"><h1>Media Consumed — Index</h1></header>
  <main class="container">
    <section class="day">
      <h2>Weeks</h2>
      <ul>${items}</ul>
    </section>
  </main>
</body>
</html>`;
}
