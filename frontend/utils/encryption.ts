/**
 * Client-side encryption utilities
 *
 * Matches backend EncryptionService expectations:
 * AES-256-GCM; output format: base64(iv):base64(tag):base64(ciphertext)
 *
 * For local testing, set NEXT_PUBLIC_ENCRYPTION_KEY to the same base64 key
 * as backend ENCRYPTION_KEY.
 */

export interface ShippingData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email?: string;
}

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 16; // 128-bit IV for GCM

function getKeyBytes(): Uint8Array {
  const keyBase64 = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error("NEXT_PUBLIC_ENCRYPTION_KEY is not set");
  }
  const binary =
    typeof window !== "undefined"
      ? atob(keyBase64)
      : Buffer.from(keyBase64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  if (bytes.length !== 32) {
    throw new Error("Encryption key must be 32 bytes (base64-encoded)");
  }
  return bytes;
}

export async function encryptShippingData(data: ShippingData): Promise<string> {
  if (typeof window === "undefined" || !crypto?.subtle) {
    throw new Error("Encryption is only supported in the browser");
  }

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const keyBytes = getKeyBytes();
  const keyBuffer = keyBytes.buffer.slice(
    keyBytes.byteOffset,
    keyBytes.byteOffset + keyBytes.byteLength
  ) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: ALGORITHM },
    false,
    ["encrypt"]
  );
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const encodedBuffer = encoded.buffer.slice(
    encoded.byteOffset,
    encoded.byteOffset + encoded.byteLength
  ) as ArrayBuffer;
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: 128 },
    cryptoKey,
    encodedBuffer
  );

  // WebCrypto returns ciphertext concatenated with tag at the end for AES-GCM
  const cipherBytes = new Uint8Array(ciphertext);
  const tagLengthBytes = 16;
  const tag = cipherBytes.slice(cipherBytes.length - tagLengthBytes);
  const encrypted = cipherBytes.slice(0, cipherBytes.length - tagLengthBytes);

  const toBase64 = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes));
  const ivB64 = toBase64(iv);
  const tagB64 = toBase64(tag);
  const encB64 = toBase64(encrypted);
  return `${ivB64}:${tagB64}:${encB64}`;
}
