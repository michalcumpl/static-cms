import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Hosting tokens are encrypted at rest (netlify-publishing design.md decision 3): AES-256-GCM
// with a key derived from SECRET_KEY. Unlike our own session tokens they can't be hashed,
// because the server has to use them.

const MIN_SECRET_LENGTH = 32;
const VERSION = "v1";

/** Where the development server keeps its generated key: `$SECRET_KEY_FILE` or `data/secret.key`. */
export function devSecretFile(env: Record<string, string | undefined> = process.env): string {
  return env.SECRET_KEY_FILE ?? resolve("data/secret.key");
}

/**
 * The development server's key: read from its file, or generated once and saved there (readable
 * by the owner only). Never used in production, where SECRET_KEY must be set explicitly.
 */
function devSecret(env: Record<string, string | undefined>): string {
  const file = devSecretFile(env);
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  const secret = randomBytes(32).toString("base64url");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${secret}\n`, { mode: 0o600 });
  console.log(`[publish] Generated a development SECRET_KEY in ${file}.`);
  return secret;
}

/**
 * The encryption key from `SECRET_KEY`. Without it the development server (NODE_ENV
 * "development") uses a generated key kept in `data/secret.key`; anywhere else there is no key
 * (undefined), and publishing isn't set up.
 */
export function secretKey(
  env: Record<string, string | undefined> = process.env,
): Buffer | undefined {
  const configured = env.SECRET_KEY;
  const secret =
    configured && configured.length >= MIN_SECRET_LENGTH
      ? configured
      : !configured && env.NODE_ENV === "development"
        ? devSecret(env)
        : undefined;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return undefined;
  return Buffer.from(hkdfSync("sha256", secret, Buffer.alloc(0), "hosting-token", 32));
}

const b64 = (bytes: Buffer) => bytes.toString("base64url");

/** `v1.<iv>.<tag>.<ciphertext>`, with a fresh random IV each time. */
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, b64(iv), b64(cipher.getAuthTag()), b64(ciphertext)].join(".");
}

/** The plain text, or undefined when the value was tampered with or the key is wrong. */
export function decryptSecret(stored: string, key: Buffer): string | undefined {
  const [version, iv, tag, ciphertext] = stored.split(".");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) return undefined;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return undefined;
  }
}
