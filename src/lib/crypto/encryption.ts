import "server-only";

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

let ephemeralKey: CryptoKey | null = null;
let warnedEphemeral = false;

async function getKey(): Promise<CryptoKey> {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw) {
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    if (bytes.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
    }
    return crypto.subtle.importKey("raw", bytes, ALGORITHM, false, [
      "encrypt",
      "decrypt",
    ]);
  }

  if (!ephemeralKey) {
    if (!warnedEphemeral) {
      console.warn(
        "[encryption] ENCRYPTION_KEY not set — using ephemeral dev key. Tokens will not survive restarts.",
      );
      warnedEphemeral = true;
    }
    ephemeralKey = await crypto.subtle.generateKey(
      { name: ALGORITHM, length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
  return ephemeralKey;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await getKey();
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    data,
  );
  return new TextDecoder().decode(decrypted);
}
