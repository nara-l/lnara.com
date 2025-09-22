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
}

export type Bucket = "music" | "video" | "article" | "tweet" | "other";

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
    console.log(`listRowsSince: Fetching last ${days} days of data`);
    const all = await this.allRows();
    console.log(`listRowsSince: Retrieved ${all.length} total rows from sheets`);

    // Fix: Use milliseconds arithmetic instead of setDate to avoid month boundary issues
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    console.log(`listRowsSince: Cutoff date is ${cutoffStr}`);

    const filtered = all.filter(r => r.date >= cutoffStr);
    console.log(`listRowsSince: After date filtering, ${filtered.length} rows remain`);
    console.log(`listRowsSince: Date comparison - cutoff: ${cutoffStr}, sample entries:`, all.slice(0, 3).map(r => ({ date: r.date, title: r.title?.substring(0, 20) })));

    if (filtered.length > 0) {
      console.log(`listRowsSince: Sample filtered entry:`, {
        id: filtered[0].id?.substring(0, 20),
        date: filtered[0].date,
        title: filtered[0].title?.substring(0, 30),
        is_public: filtered[0].is_public,
        bucket: filtered[0].bucket
      });
    }

    return filtered;
  }

  async listRowsForIsoWeek(year: number, week: number): Promise<EntryRow[]> {
    console.log(`listRowsForIsoWeek: Starting for week ${year}-${week}`);
    const all = await this.allRows();
    console.log(`listRowsForIsoWeek: Retrieved ${all.length} total rows`);

    // Compute Mon..Sun ET-local date strings for the specified week
    const days = this.weekDays(year, week);

    const set = new Set(days);
    const filtered = all.filter(r => set.has(r.date));
    console.log(`listRowsForIsoWeek: Found ${filtered.length} entries for week ${year}-${week}`);

    if (filtered.length > 0) {
      console.log(`listRowsForIsoWeek: Sample entries:`, filtered.slice(0, 3).map(r => ({
        date: r.date,
        title: r.title?.substring(0, 30),
        is_public: r.is_public
      })));
      const publicCount = filtered.filter(r => r.is_public).length;
      console.log(`listRowsForIsoWeek: ${publicCount} are public, ${filtered.length - publicCount} are private`);
    }

    return filtered;
  }

  async updateRow(id: string, patch: Partial<Pick<EntryRow, "notes" | "is_public">>): Promise<void> {
    console.log(`updateRow: Starting update for id ${id}, patch:`, patch);

    const sheet = await this.valuesGet("media_log!A:Z");
    if (!sheet || sheet.length === 0) {
      console.log("updateRow: No sheet data found");
      return;
    }

    console.log(`updateRow: Retrieved sheet with ${sheet.length} rows`);
    const header = sheet[0];
    let idIdx = header.indexOf("id");
    if (idIdx < 0) idIdx = 0;
    const notesIdx = header.indexOf("notes");
    const pubIdx = header.indexOf("is_public");
    const updatedIdx = header.indexOf("updated_at");

    console.log(`updateRow: Column indices - id: ${idIdx}, notes: ${notesIdx}, is_public: ${pubIdx}, updated_at: ${updatedIdx}`);

    for (let i = 1; i < sheet.length; i++) {
      const row = sheet[i];
      if (row[idIdx] === id) {
        console.log(`updateRow: Found matching row at index ${i}, current values:`, {
          id: row[idIdx],
          notes: row[notesIdx],
          is_public: row[pubIdx]
        });

        if (typeof patch.notes !== "undefined" && notesIdx >= 0) {
          row[notesIdx] = patch.notes ?? "";
          console.log(`updateRow: Updated notes to: "${patch.notes}"`);
        }
        if (typeof patch.is_public !== "undefined" && pubIdx >= 0) {
          row[pubIdx] = patch.is_public ? "TRUE" : "FALSE";
          console.log(`updateRow: Updated is_public to: ${patch.is_public ? "TRUE" : "FALSE"}`);
        }
        if (updatedIdx >= 0) {
          row[updatedIdx] = new Date().toISOString();
        }

        const range = `media_log!A${i+1}:Z${i+1}`;
        console.log(`updateRow: Updating range ${range} with row:`, row);

        await this.valuesUpdate(range, [row]);
        console.log(`updateRow: Successfully updated row for id ${id}`);
        return;
      }
    }

    console.log(`updateRow: No row found with id ${id}`);
  }

  private async allRows(): Promise<EntryRow[]> {
    console.log("allRows: Starting to fetch recent rows (optimized)");
    await this.ensureHeader();
    console.log("allRows: Header ensured, fetching all data with header");
    // Fetch all rows to ensure we get the header row properly
    const values = await this.valuesGet("media_log!A:Z");
    console.log(`allRows: Raw values response - ${values ? values.length : 0} rows`);

    if (!values || values.length <= 1) {
      console.log("allRows: No data found or only header row");
      return [];
    }

    const header = values[0];
    console.log("allRows: Header columns:", header);
    console.log("allRows: Header length:", header.length);
    console.log("allRows: First few header values:", header.slice(0, 10));
    console.log("allRows: Sample data row:", values[1]?.slice(0, 10));

    // TEMPORARY FIX: If header is empty or invalid, use expected header
    // Check if the first column is exactly "id" (not just contains "id")
    if (!header || header.length === 0 || header[0] !== "id") {
      console.log("allRows: Header seems corrupted, using expected header");
      console.log("allRows: First header value is:", header[0]);
      const expectedHeader = ["id", "date", "bucket", "title", "url", "source", "notes", "is_public", "created_at", "updated_at"];
      console.log("allRows: Using fallback header:", expectedHeader);
      return this.processRowsWithHeader(expectedHeader, values);
    }
    const rows = values.slice(1).map(v => this.mapRow(header, v));
    const filteredRows = rows.filter(Boolean) as EntryRow[];
    console.log(`allRows: Mapped and filtered to ${filteredRows.length} valid rows`);

    return filteredRows;
  }

  private processRowsWithHeader(header: string[], values: string[][]): EntryRow[] {
    console.log(`processRowsWithHeader: Processing ${values.length} values with fallback header`);
    // Skip the corrupted first row and process all remaining rows as data
    const dataRows = values.slice(1);
    const rows = dataRows.map(v => this.mapRow(header, v));
    const filteredRows = rows.filter(Boolean) as EntryRow[];
    console.log(`processRowsWithHeader: Mapped and filtered to ${filteredRows.length} valid rows`);
    return filteredRows;
  }

  private mapRow(header: string[], v: string[]): EntryRow | null {
    const idx = (name: string) => header.indexOf(name);
    const pick = (name: string) => {
      const i = idx(name);
      return i >= 0 ? (v[i] ?? "") : "";
    };

    const idValue = pick("id");
    if (!idValue) {
      console.log(`mapRow: Rejecting row - no id value`);
      return null;
    }

    return {
      id: idValue,
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

  private weekDays(year: number, week: number): string[] {
    console.log(`weekDays: Calculating dates for ISO week ${year}-${week}`);
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
    console.log(`weekDays: Week ${year}-${week} includes dates:`, out);
    return out;
  }

  private async valuesGet(range: string): Promise<string[][]> {
    console.log(`valuesGet: Starting API call for range "${range}"`);
    const token = await this.token();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.env.SHEETS_ID}/values/${encodeURIComponent(range)}`;
    console.log(`valuesGet: API URL: ${url}`);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    console.log(`valuesGet: Response status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      console.log(`valuesGet: API error - status ${res.status}`);
      const errorText = await res.text();
      console.log(`valuesGet: Error response body: ${errorText}`);
      return [] as any;
    }

    const json = await res.json();
    console.log(`valuesGet: Response structure:`, {
      hasValues: !!json.values,
      valuesLength: json.values?.length || 0,
      firstRowLength: json.values?.[0]?.length || 0,
      responseKeys: Object.keys(json)
    });

    const result = (json.values ?? []) as string[][];
    console.log(`valuesGet: Returning ${result.length} rows`);
    return result;
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
