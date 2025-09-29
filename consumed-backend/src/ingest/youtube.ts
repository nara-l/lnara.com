import type { Env, EntryRow } from "../sheets";
import { nowInNY } from "../utils/time";

export async function ingestYouTubeLikes(env: Env): Promise<EntryRow[]> {
  const token = await getYouTubeAccessToken(env);
  if (!token) {
    console.error("YouTube ingest failed: No valid access token");
    return [];
  }

  let likesId = await env.RUN_STATUS.get("yt:likes_playlist_id");
  if (!likesId) {
    likesId = await fetchLikesPlaylistId(token);
    if (likesId) {
      await env.RUN_STATUS.put("yt:likes_playlist_id", likesId);
    } else {
      console.error("YouTube ingest failed: Could not fetch likes playlist ID");
      return [];
    }
  }

  if (!likesId) {
    console.error("YouTube ingest failed: No likes playlist ID available");
    return [];
  }

  const since = await env.RUN_STATUS.get("yt:last_liked_at");
  const items = await fetchAllLikedItems(token, likesId);
  const nowIso = new Date().toISOString();
  let maxLiked = since || "";
  const out: EntryRow[] = [];
  for (const it of items) {
    const videoId = it.snippet?.resourceId?.videoId;
    const likedAt = it.snippet?.publishedAt; // when added to playlist
    const title = it.snippet?.title || "(untitled)";
    if (!videoId || !likedAt) continue;
    if (since && likedAt <= since) continue;
    const id = `youtube:${videoId}|${likedAt}`;
    const etDate = new Date(likedAt).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    out.push({
      id,
      date: etDate,
      bucket: "video",
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      source: "youtube",
      notes: "",
      is_public: true,
      created_at: nowIso,
      updated_at: nowIso,
    });
    if (likedAt > maxLiked) maxLiked = likedAt;
  }
  if (out.length && maxLiked) {
    await env.RUN_STATUS.put("yt:last_liked_at", maxLiked);
  }

  console.log(`YouTube ingest completed: ${out.length} new liked videos found`);
  return out;
}

async function getYouTubeAccessToken(env: Env): Promise<string | null> {
  const refreshToken = await env.RUN_STATUS.get("yt:refresh_token");
  if (!refreshToken) {
    console.error("YouTube: No refresh token found - manual re-authorization required");
    return null;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.YOUTUBE_CLIENT_ID,
    client_secret: env.YOUTUBE_CLIENT_SECRET,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`YouTube token refresh failed (${res.status}):`, errorText);

    // Check if refresh token expired (common error)
    if (res.status === 400 && errorText.includes("invalid_grant")) {
      console.error("YouTube refresh token expired - manual re-authorization required at /oauth/youtube/start");
    }
    return null;
  }

  const json = await res.json();
  console.log("YouTube token refreshed successfully");

  // Store last successful refresh time for monitoring
  await env.RUN_STATUS.put("yt:last_token_refresh", new Date().toISOString());

  return json.access_token as string;
}

async function fetchLikesPlaylistId(token: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?mine=true&part=contentDetails", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json: any = await res.json();
  const likes = json?.items?.[0]?.contentDetails?.relatedPlaylists?.likes;
  return likes || null;
}

async function fetchAllLikedItems(token: string, playlistId: string): Promise<any[]> {
  const out: any[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 10; i++) { // safety cap
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const json: any = await res.json();
    out.push(...(json.items || []));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

