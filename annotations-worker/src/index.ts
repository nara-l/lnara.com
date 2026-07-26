import { removePublicAnnotation, upsertPublicAnnotation } from "./github";
import {
  createSession,
  readCookie,
  sessionCookie,
  verifySession,
} from "./session";
import type {
  AnnotationInput,
  AnnotationPatch,
  Env,
  StoredAnnotation,
} from "./types";
import {
  parseAnnotationInput,
  parseAnnotationPatch,
  validateSlug,
} from "./validation";

const json = (value: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(value, { status, headers });

const corsHeaders = (request: Request, env: Env) => {
  const origin = request.headers.get("Origin");
  const headers = new Headers({ Vary: "Origin" });
  if (origin === env.ALLOWED_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Idempotency-Key"
    );
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS"
    );
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

const getStoredAnnotation = async (env: Env, slug: string, id: string) => {
  const row = await env.ANNOTATIONS_DB.prepare(
    "SELECT * FROM annotations WHERE slug = ? AND id = ?"
  )
    .bind(slug, id)
    .first<Record<string, unknown>>();
  return row ? rowToAnnotation(row) : null;
};

const getPriorResponse = async (
  env: Env,
  requestKey: string
): Promise<unknown | null> => {
  const prior = await env.ANNOTATIONS_DB.prepare(
    "SELECT response_json FROM annotation_requests WHERE request_key = ?"
  )
    .bind(requestKey)
    .first<{ response_json: string }>();
  return prior ? JSON.parse(prior.response_json) : null;
};

const requestKeyFrom = (request: Request) => {
  const requestKey = request.headers.get("Idempotency-Key");
  return requestKey && /^[a-zA-Z0-9-]{16,100}$/.test(requestKey)
    ? requestKey
    : null;
};

const requestRecord = (
  env: Env,
  requestKey: string,
  annotationId: string,
  response: unknown,
  now: string
) =>
  env.ANNOTATIONS_DB.prepare(
    `INSERT INTO annotation_requests (request_key, annotation_id, response_json, created_at)
     VALUES (?, ?, ?, ?)`
  ).bind(requestKey, annotationId, JSON.stringify(response), now);

const saveAnnotation = async (
  env: Env,
  slug: string,
  input: AnnotationInput,
  requestKey: string
) => {
  const prior = await getPriorResponse(env, requestKey);
  if (prior) return prior as StoredAnnotation;

  if (await getStoredAnnotation(env, slug, input.id)) {
    throw new Error("Annotation id already exists");
  }

  const now = new Date().toISOString();
  if (input.visibility === "public") {
    await upsertPublicAnnotation(env, slug, input, now);
  }

  const stored: StoredAnnotation = {
    ...input,
    slug,
    createdAt: now,
    updatedAt: now,
  };

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
    requestRecord(env, requestKey, input.id, stored, now),
  ]);
  return stored;
};

const updateAnnotation = async (
  env: Env,
  slug: string,
  id: string,
  patch: AnnotationPatch,
  requestKey: string
) => {
  const prior = await getPriorResponse(env, requestKey);
  if (prior) return prior as StoredAnnotation;

  const existing = await getStoredAnnotation(env, slug, id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const updated: StoredAnnotation = {
    ...existing,
    ...patch,
    tags: patch.tags ?? existing.tags,
    updatedAt: now,
  };

  if (updated.visibility === "public") {
    await upsertPublicAnnotation(env, slug, updated, existing.createdAt);
  } else if (existing.visibility === "public") {
    await removePublicAnnotation(env, slug, id);
  }

  await env.ANNOTATIONS_DB.batch([
    env.ANNOTATIONS_DB.prepare(
      `UPDATE annotations
       SET note_text = ?, tags_json = ?, visibility = ?, updated_at = ?
       WHERE slug = ? AND id = ?`
    ).bind(
      updated.text,
      JSON.stringify(updated.tags),
      updated.visibility,
      now,
      slug,
      id
    ),
    requestRecord(env, requestKey, id, updated, now),
  ]);
  return updated;
};

const deleteAnnotation = async (
  env: Env,
  slug: string,
  id: string,
  requestKey: string
) => {
  const prior = await getPriorResponse(env, requestKey);
  if (prior) return prior as { deleted: string };

  const existing = await getStoredAnnotation(env, slug, id);
  if (!existing) return null;
  if (existing.visibility === "public") {
    await removePublicAnnotation(env, slug, id);
  }

  const now = new Date().toISOString();
  const result = { deleted: id };
  await env.ANNOTATIONS_DB.batch([
    env.ANNOTATIONS_DB.prepare(
      "DELETE FROM annotations WHERE slug = ? AND id = ?"
    ).bind(slug, id),
    requestRecord(env, requestKey, id, result, now),
  ]);
  return result;
};

export const handleRequest = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const headers = corsHeaders(request, env);

  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (
    request.headers.get("Origin") &&
    !headers.has("Access-Control-Allow-Origin")
  ) {
    return json({ error: "Origin not allowed" }, 403, headers);
  }

  if (
    url.pathname === "/api/annotations/session" &&
    request.method === "POST"
  ) {
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

  const match = url.pathname.match(
    /^\/api\/annotations\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/
  );
  if (!match || !validateSlug(match[1])) {
    return json({ error: "Not found" }, 404, headers);
  }
  const slug = match[1];
  const annotationId = match[2];

  if (request.method === "GET" && !annotationId) {
    const result = await env.ANNOTATIONS_DB.prepare(
      "SELECT * FROM annotations WHERE slug = ? ORDER BY created_at"
    )
      .bind(slug)
      .all<Record<string, unknown>>();
    return json(
      {
        annotations: result.results.map(rowToAnnotation),
        publicPublishing: Boolean(env.GITHUB_TOKEN),
      },
      200,
      headers
    );
  }

  if (request.method === "POST" && !annotationId) {
    const requestKey = requestKeyFrom(request);
    if (!requestKey) {
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

  if (request.method === "PATCH" && annotationId) {
    const requestKey = requestKeyFrom(request);
    if (!requestKey) {
      return json({ error: "Valid Idempotency-Key required" }, 400, headers);
    }
    const patch = parseAnnotationPatch(await request.json().catch(() => null));
    if (!patch)
      return json({ error: "Invalid annotation update" }, 400, headers);

    try {
      const annotation = await updateAnnotation(
        env,
        slug,
        annotationId,
        patch,
        requestKey
      );
      return annotation
        ? json({ annotation }, 200, headers)
        : json({ error: "Annotation not found" }, 404, headers);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Annotation update failed";
      return json({ error: message }, 503, headers);
    }
  }

  if (request.method === "DELETE" && annotationId) {
    const requestKey = requestKeyFrom(request);
    if (!requestKey) {
      return json({ error: "Valid Idempotency-Key required" }, 400, headers);
    }
    try {
      const result = await deleteAnnotation(
        env,
        slug,
        annotationId,
        requestKey
      );
      return result
        ? json(result, 200, headers)
        : json({ error: "Annotation not found" }, 404, headers);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Annotation delete failed";
      return json({ error: message }, 503, headers);
    }
  }

  return json({ error: "Method not allowed" }, 405, headers);
};

export default { fetch: handleRequest };
