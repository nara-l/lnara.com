import { publishAnnotation } from "./github";
import { createSession, readCookie, sessionCookie, verifySession } from "./session";
import type { AnnotationInput, Env, StoredAnnotation } from "./types";
import { parseAnnotationInput, validateSlug } from "./validation";

const json = (value: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(value, { status, headers });

const corsHeaders = (request: Request, env: Env) => {
  const origin = request.headers.get("Origin");
  const headers = new Headers({ Vary: "Origin" });
  if (origin === env.ALLOWED_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key");
    headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  }
  return headers;
};

const authorized = (request: Request, env: Env) =>
  verifySession(readCookie(request, "lnara_author"), env.SESSION_SECRET);

const rowToAnnotation = (row: Record<string, unknown>): StoredAnnotation => ({
  id: String(row.id),
  slug: String(row.slug),
  selector: {
    exact: String(row.exact_quote),
    ...(row.prefix_quote ? { prefix: String(row.prefix_quote) } : {}),
    ...(row.suffix_quote ? { suffix: String(row.suffix_quote) } : {}),
  },
  text: String(row.note_text),
  tags: JSON.parse(String(row.tags_json)),
  visibility: row.visibility === "public" ? "public" : "private",
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const saveAnnotation = async (
  env: Env,
  slug: string,
  input: AnnotationInput,
  requestKey: string
) => {
  const prior = await env.ANNOTATIONS_DB.prepare(
    "SELECT response_json FROM annotation_requests WHERE request_key = ?"
  )
    .bind(requestKey)
    .first<{ response_json: string }>();
  if (prior) return JSON.parse(prior.response_json) as StoredAnnotation;

  const now = new Date().toISOString();
  if (input.visibility === "public") {
    await publishAnnotation(env, slug, input, now);
  }

  const stored: StoredAnnotation = {
    ...input,
    slug,
    createdAt: now,
    updatedAt: now,
  };
  const responseJson = JSON.stringify(stored);

  await env.ANNOTATIONS_DB.batch([
    env.ANNOTATIONS_DB.prepare(
      `INSERT INTO annotations
       (id, slug, exact_quote, prefix_quote, suffix_quote, note_text, tags_json, visibility, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.id,
      slug,
      input.selector.exact,
      input.selector.prefix ?? null,
      input.selector.suffix ?? null,
      input.text,
      JSON.stringify(input.tags),
      input.visibility,
      now,
      now
    ),
    env.ANNOTATIONS_DB.prepare(
      `INSERT INTO annotation_requests (request_key, annotation_id, response_json, created_at)
       VALUES (?, ?, ?, ?)`
    ).bind(requestKey, input.id, responseJson, now),
  ]);
  return stored;
};

export const handleRequest = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const headers = corsHeaders(request, env);

  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.headers.get("Origin") && !headers.has("Access-Control-Allow-Origin")) {
    return json({ error: "Origin not allowed" }, 403, headers);
  }

  if (url.pathname === "/api/annotations/session" && request.method === "POST") {
    const body = (await request.json().catch(() => null)) as {
      password?: string;
    } | null;
    if (!body?.password || body.password !== env.AUTHOR_PASSWORD) {
      return json({ error: "Invalid password" }, 401, headers);
    }
    const token = await createSession(env.SESSION_SECRET);
    headers.append(
      "Set-Cookie",
      sessionCookie(token, url.protocol === "https:")
    );
    return json({ authenticated: true }, 200, headers);
  }

  if (!(await authorized(request, env))) {
    return json({ error: "Unauthorized" }, 401, headers);
  }

  const match = url.pathname.match(/^\/api\/annotations\/([a-z0-9-]+)$/);
  if (!match || !validateSlug(match[1])) {
    return json({ error: "Not found" }, 404, headers);
  }
  const slug = match[1];

  if (request.method === "GET") {
    const result = await env.ANNOTATIONS_DB.prepare(
      "SELECT * FROM annotations WHERE slug = ? ORDER BY created_at"
    )
      .bind(slug)
      .all<Record<string, unknown>>();
    return json({ annotations: result.results.map(rowToAnnotation) }, 200, headers);
  }

  if (request.method === "POST") {
    const requestKey = request.headers.get("Idempotency-Key");
    if (!requestKey || !/^[a-zA-Z0-9-]{16,100}$/.test(requestKey)) {
      return json({ error: "Valid Idempotency-Key required" }, 400, headers);
    }
    const input = parseAnnotationInput(await request.json().catch(() => null));
    if (!input) return json({ error: "Invalid annotation" }, 400, headers);

    try {
      const annotation = await saveAnnotation(env, slug, input, requestKey);
      return json({ annotation }, 201, headers);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Annotation save failed";
      return json({ error: message }, 503, headers);
    }
  }

  return json({ error: "Method not allowed" }, 405, headers);
};

export default { fetch: handleRequest };
