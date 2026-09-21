import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret =
    process.env.TOKEN_ENCRYPTION_KEY ?? process.env.GITHUB_CLIENT_SECRET;
  if (!secret) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY (or GITHUB_CLIENT_SECRET fallback) is not set.",
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptToken(payload: string): string {
  const [ivB64, dataB64, tagB64] = payload.split(".");
  if (!ivB64 || !dataB64 || !tagB64) throw new Error("Invalid token payload.");
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return (
    decipher.update(Buffer.from(dataB64, "base64")).toString("utf8") +
    decipher.final("utf8")
  );
}

export function resolveGithubToken(stored: string): string {
  if (!stored.includes(".")) return stored;
  try {
    return decryptToken(stored);
  } catch {
    return stored;
  }
}
