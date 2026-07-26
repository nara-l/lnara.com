const encoder = new TextEncoder();
const SESSION_SECONDS = 8 * 60 * 60;

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const sign = async (body: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64url(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(body))
    )
  );
};

export const createSession = async (secret: string, now = Date.now()) => {
  const body = base64url(
    encoder.encode(JSON.stringify({ role: "author", exp: now + SESSION_SECONDS * 1000 }))
  );
  return `${body}.${await sign(body, secret)}`;
};

export const verifySession = async (
  token: string | undefined,
  secret: string,
  now = Date.now()
) => {
  if (!token) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature || (await sign(body, secret)) !== signature) return false;

  try {
    const normalized = body.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const payload = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(json, char => char.charCodeAt(0)))
    ) as { role?: string; exp?: number };
    return payload.role === "author" && typeof payload.exp === "number" && payload.exp > now;
  } catch {
    return false;
  }
};

export const readCookie = (request: Request, name: string) => {
  const cookie = request.headers.get("Cookie") ?? "";
  return cookie
    .split(";")
    .map(value => value.trim().split("="))
    .find(([key]) => key === name)
    ?.slice(1)
    .join("=");
};

export const sessionCookie = (token: string, secure: boolean) =>
  [
    `lnara_author=${token}`,
    "Path=/api/annotations",
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
    `Max-Age=${SESSION_SECONDS}`,
  ]
    .filter(Boolean)
    .join("; ");
