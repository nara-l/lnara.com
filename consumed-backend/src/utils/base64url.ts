export function base64UrlEncode(buf: ArrayBuffer | Uint8Array | string): string {
  let binary = "";
  if (typeof buf === "string") {
    binary = btoa(unescape(encodeURIComponent(buf)));
  } else {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
    binary = btoa(s);
  }
  return binary.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function pemToPkcs8(pem: string): ArrayBuffer {
  const clean = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  return base64ToArrayBuffer(clean);
}

