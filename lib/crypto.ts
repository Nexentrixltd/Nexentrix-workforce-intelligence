import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const VERSION = "v1";

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  }
  return key;
}

export const fieldAad = (userId: string, field: string) => `${userId}:${field}`;

export function encryptField(plain: string, aad: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(".");
}

export function decryptField(payload: string, aad: string): string {
  const [version, iv, tag, enc] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !enc) {
    throw new Error("Invalid encrypted payload");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(iv, "base64")
  );
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(enc, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export const last4 = (value: string) => value.replace(/[\s-]/g, "").slice(-4);

export const maskLast4 = (l4: string | null | undefined) =>
  l4 ? `•••• ${l4}` : null;