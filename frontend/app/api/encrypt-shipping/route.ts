import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";

export interface ShippingData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email?: string;
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
// TAG_LENGTH = 16 (used implicitly by aes-256-gcm)

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY not configured. Run: node scripts/generate-encryption-keys.js"
    );
  }
  const keyBuffer = Buffer.from(key, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error(
      `Invalid ENCRYPTION_KEY: expected 32 bytes, got ${keyBuffer.length}`
    );
  }
  return keyBuffer;
}

function encryptData(data: ShippingData): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const tag = cipher.getAuthTag();
  
  // Format: base64(iv):base64(tag):base64(ciphertext)
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ["name", "address", "city", "state", "zip", "country", "phone"];
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== "string") {
        return NextResponse.json(
          { error: `Missing or invalid field: ${field}` },
          { status: 400 }
        );
      }
    }

    const shippingData: ShippingData = {
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      country: body.country,
      phone: body.phone,
      email: body.email || undefined,
    };

    const encrypted = encryptData(shippingData);
    
    return NextResponse.json({ encrypted });
  } catch (error) {
    console.error("Encryption error:", error);
    return NextResponse.json(
      { error: "Failed to encrypt shipping data" },
      { status: 500 }
    );
  }
}
