import { optionalEnv, requireEnv } from "@/lib/env";

export type AuthToken = {
  v: 1;
  iat: number;
};

const enc = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  // Edge has btoa/atob; Node has Buffer.
  if (typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B = (globalThis as any).Buffer as typeof Buffer | undefined;
  if (!B) throw new Error("Base64 encoder unavailable");
  return B.from(bytes).toString("base64");
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B = (globalThis as any).Buffer as typeof Buffer | undefined;
  if (!B) throw new Error("Base64 decoder unavailable");
  return new Uint8Array(B.from(base64, "base64"));
}

function b64urlEncodeString(value: string): string {
  return bytesToBase64(enc.encode(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function b64urlDecodeToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  return base64ToBytes(base64 + pad);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is unavailable");
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(message)
  );
  return bytesToBase64(new Uint8Array(sig))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function isAuthEnabled(): boolean {
  return Boolean(optionalEnv("APP_PASSWORD"));
}

export function verifyPassword(pw: string): boolean {
  const expected = requireEnv("APP_PASSWORD");
  return pw === expected;
}

export async function signAuthToken(token: AuthToken): Promise<string> {
  const secret = requireEnv("APP_AUTH_SECRET");
  const payload = b64urlEncodeString(JSON.stringify(token));
  const sig = await hmacSha256Base64Url(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyAuthToken(value: string | null | undefined): Promise<boolean> {
  if (!value) return false;
  const secret = requireEnv("APP_AUTH_SECRET");
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = await hmacSha256Base64Url(secret, payload);
  if (!constantTimeEqual(b64urlDecodeToBytes(sig), b64urlDecodeToBytes(expectedSig))) {
    return false;
  }

  try {
    const decoded = JSON.parse(
      new TextDecoder().decode(b64urlDecodeToBytes(payload))
    ) as AuthToken;
    if (decoded.v !== 1) return false;
    if (typeof decoded.iat !== "number") return false;
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - decoded.iat > maxAgeMs) return false;
    return true;
  } catch {
    return false;
  }
}
