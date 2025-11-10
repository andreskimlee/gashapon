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

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 16; // 128-bit IV for GCM

function getKeyBytes(): Uint8Array {
  const keyBase64 = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error('NEXT_PUBLIC_ENCRYPTION_KEY is not set');
  }
  const binary = typeof window !== 'undefined' ? atob(keyBase64) : Buffer.from(keyBase64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  if (bytes.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (base64-encoded)');
  }
  return bytes;
}

export async function encryptShippingData(data: ShippingData): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const keyBytes = getKeyBytes();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false,
    ['encrypt']
  );

  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv, tagLength: 128 },
    cryptoKey,
    encoded
  );

  // WebCrypto returns ciphertext concatenated with tag at the end for AES-GCM
  const cipherBytes = new Uint8Array(ciphertext);
  const tagLengthBytes = 16;
  const tag = cipherBytes.slice(cipherBytes.length - tagLengthBytes);
  const encrypted = cipherBytes.slice(0, cipherBytes.length - tagLengthBytes);

  const ivB64 = btoa(String.fromCharCode(...iv));
  const tagB64 = btoa(String.fromCharCode(...tag));
  const encB64 = btoa(String.fromCharCode(...encrypted));

  return `${ivB64}:${tagB64}:${encB64}`;
}


