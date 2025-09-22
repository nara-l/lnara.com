import type { Env, EntryRow } from "../sheets";
import { nowInNY } from "../utils/time";
import { sha256Hex } from "../utils/hash";

export async function ingestLastFm(env: Env): Promise<EntryRow[]> {
  try {
    const api = "https://ws.audioscrobbler.com/2.0/";
    const url = `${api}?method=user.getrecenttracks&user=${encodeURIComponent(env.LASTFM_USER)}&api_key=${encodeURIComponent(env.LASTFM_API_KEY)}&format=json&limit=200`;
    console.log("Last.fm API URL:", url);

    const res = await fetch(url);
    console.log("Last.fm API response status:", res.status);
    if (!res.ok) {
      console.log("Last.fm API failed:", res.statusText);
      return [];
    }

    const json: any = await res.json();
    console.log("Last.fm API response keys:", Object.keys(json));

    const tracks: any[] = json?.recenttracks?.track || [];
    console.log("Last.fm tracks found:", tracks.length);

    if (!Array.isArray(tracks)) {
      console.log("Tracks is not an array:", tracks);
      return [];
    }

    const out: EntryRow[] = [];
    for (const t of tracks) {
      console.log("Processing track object:", JSON.stringify(t, null, 2));
      
      const date = t?.date?.uts ? Number(t.date.uts) : null;
      console.log(`Track: ${t?.artist?.["#text"]} - ${t?.name}, date:`, date);
      
      if (!date) {
        console.log("Skipping - no date (now playing)");
        continue;
      }
      
      const artist = t?.artist?.["#text"] || "";
      const name = t?.name || "";
      const title = `${artist} — ${name}`.trim();
      const url = t?.url || "";
      const etDate = new Date(date * 1000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      console.log("Creating hash for:", `${artist}|${name}|${date}`);
      const id = await sha256Hex(`${artist}|${name}|${date}`);
      const nowIso = new Date().toISOString();
      
      console.log("Adding track to output:", title);
      out.push({
        id,
        date: etDate,
        bucket: "music",
        title,
        url,
        source: "lastfm",
        notes: "",
        is_public: false,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
    console.log("Final output rows:", out.length);
    return out;
  } catch (error) {
    console.error("Error in ingestLastFm:", error);
    return [];
  }
}
