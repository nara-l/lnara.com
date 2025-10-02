export interface Env {
  DASHBOARD_PASSWORD: string;
  SESSION_SECRET: string;
  SHEETS_ID: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  LASTFM_USER: string;
  LASTFM_API_KEY: string;
  YOUTUBE_CLIENT_ID: string;
  YOUTUBE_CLIENT_SECRET: string;
  PUBLIC_REPO: string;
  PUBLIC_REPO_BRANCH: string;
  GITHUB_DEPLOY_KEY: string;
  // Optional GitHub token for REST API publishing (preferred over deploy key in Workers)
  GITHUB_TOKEN?: string;
  RUN_STATUS: KVNamespace;
  CONSUMED_PHOTOS: R2Bucket;
}

export type Bucket = "music" | "video" | "article" | "tweet" | "physical" | "other";

export interface EntryRow {
  id: string;
  date: string; // YYYY-MM-DD local ET
  bucket: Bucket;
  title: string;
  url: string;
  source: string; // lastfm | youtube | manual | etc.
  notes: string;
  is_public: boolean;
  created_at: string; // ISO
  updated_at: string; // ISO
}

// Placeholder interfaces for Sheets operations.
// Implement using Google Sheets API v4 with service account in the private repo.

export class SheetsClient {
  constructor(private env: Env) {}

  private async token(): Promise<string> {
    const sa = JSON.parse(this.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const scope = "https://www.googleapis.com/auth/spreadsheets";
    const { getGoogleAccessToken } = await import("./utils/googleAuth");
    return getGoogleAccessToken({ client_email: sa.client_email, private_key: sa.private_key }, scope);
  }

  private async ensureHeader(): Promise<void> {
    const values = await this.valuesGet("media_log!1:1");
    if (!values || values.length === 0) {
      await this.valuesAppend([["id","date","bucket","title","url","source","notes","is_public","created_at","updated_at"]]);
    }
  }

  async appendRows(rows: EntryRow[]): Promise<void> {
    await this.ensureHeader();
    const values = rows.map(r => [
      r.id,
      r.date,
      r.bucket,
      r.title,
      r.url,
      r.source,
      r.notes ?? "",
      r.is_public ? "TRUE" : "FALSE",
      r.created_at,
      r.updated_at,
    ]);
    await this.valuesAppend(values);
  }

  async listRowsSince(days: number): Promise<EntryRow[]> {
    const all = await this.allRows();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    return all.filter(r => r.date >= cutoffStr);
  }

  async listRowsForIsoWeek(year: number, week: number): Promise<EntryRow[]> {
    const all = await this.allRows();
    // Compute Mon..Sun ET-local date strings for the specified week
    const days = await this.weekDays(year, week);
    const set = new Set(days);
    return all.filter(r => set.has(r.date));
  }

  async updateRow(id: string, patch: Partial<Pick<EntryRow, "notes" | "is_public">>): Promise<void> {
    const sheet = await this.valuesGet("media_log!A:Z");
    if (!sheet || sheet.length === 0) return;
    const header = sheet[0];
    let idIdx = header.indexOf("id");
    if (idIdx < 0) idIdx = 0;
    const notesIdx = header.indexOf("notes");
    const pubIdx = header.indexOf("is_public");
    const updatedIdx = header.indexOf("updated_at");
    for (let i = 1; i < sheet.length; i++) {
      const row = sheet[i];
      if (row[idIdx] === id) {
        if (typeof patch.notes !== "undefined" && notesIdx >= 0) row[notesIdx] = patch.notes ?? "";
        if (typeof patch.is_public !== "undefined" && pubIdx >= 0) row[pubIdx] = patch.is_public ? "TRUE" : "FALSE";
        if (updatedIdx >= 0) row[updatedIdx] = new Date().toISOString();
        await this.valuesUpdate(`media_log!A${i+1}:Z${i+1}`, [row]);
        return;
      }
    }
  }

  private async allRows(): Promise<EntryRow[]> {
    await this.ensureHeader();
    const values = await this.valuesGet("media_log!A:Z");
    if (!values || values.length <= 1) return [];
    const header = values[0];
    const rows = values.slice(1).map(v => this.mapRow(header, v));
    return rows.filter(Boolean) as EntryRow[];
  }

  private mapRow(header: string[], v: string[]): EntryRow | null {
    const idx = (name: string) => header.indexOf(name);
    const pick = (name: string) => {
      const i = idx(name);
      return i >= 0 ? (v[i] ?? "") : "";
    };
    if (!pick("id")) return null;
    return {
      id: pick("id"),
      date: pick("date"),
      bucket: (pick("bucket") as any) || "other",
      title: pick("title"),
      url: pick("url"),
      source: pick("source"),
      notes: pick("notes"),
      is_public: (pick("is_public").toUpperCase() === "TRUE"),
      created_at: pick("created_at"),
      updated_at: pick("updated_at"),
    };
  }

  private async weekDays(year: number, week: number): Promise<string[]> {
    // Monday of ISO week
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const day = jan4.getUTCDay() || 7;
    const mondayUTC = new Date(jan4);
    mondayUTC.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(mondayUTC.getTime());
      dt.setUTCDate(mondayUTC.getUTCDate() + i);
      const s = dt.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      out.push(s);
    }
    return out;
  }

  private async valuesGet(range: string): Promise<string[][]> {
    const token = await this.token();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SHEETS_ID}/values/${encodeURIComponent(range)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [] as any;
    const json = await res.json();
    return (json.values ?? []) as string[][];
  }

  private async valuesAppend(values: any[][]): Promise<void> {
    const token = await this.token();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SHEETS_ID}/values/${encodeURIComponent("media_log!A:Z")}:append?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ values }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Sheets append failed: ${res.status} ${t}`);
    }
  }

  private async valuesUpdate(range: string, values: any[][]): Promise<void> {
    const token = await this.token();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SHEETS_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ values }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Sheets update failed: ${res.status} ${t}`);
    }
  }
}
