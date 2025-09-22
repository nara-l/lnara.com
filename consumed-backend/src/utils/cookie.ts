export type CookieOptions = {
  path?: string;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  secure?: boolean;
  maxAge?: number; // seconds
};

export function setCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [
    `${name}=${value}`,
    `Path=${opts.path ?? "/"}`,
    opts.httpOnly ? "HttpOnly" : undefined,
    opts.sameSite ? `SameSite=${opts.sameSite}` : "SameSite=Lax",
    opts.secure ? "Secure" : undefined,
    typeof opts.maxAge === "number" ? `Max-Age=${opts.maxAge}` : undefined,
  ].filter(Boolean);
  return parts.join("; ");
}

export function parseCookies(header?: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const pairs = header.split(";");
  for (const p of pairs) {
    const [k, ...rest] = p.split("=");
    const key = k.trim();
    const val = rest.join("=").trim();
    if (key) out[key] = decodeURIComponent(val ?? "");
  }
  return out;
}

export async function hmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function makeSessionCookie(payload: object, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const body = btoa(unescape(encodeURIComponent(json)));
  const sig = await hmac(body, secret);
  return `${body}.${sig}`;
}

export async function verifySessionCookie(cookie: string, secret: string): Promise<any | null> {
  const [body, sig] = cookie.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body, secret);
  if (expected !== sig) return null;
  try {
    const json = decodeURIComponent(escape(atob(body)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

