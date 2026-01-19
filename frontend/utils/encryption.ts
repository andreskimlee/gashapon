/**
 * Client-side utility to encrypt shipping data via server-side API
 * 
 * The actual encryption happens on the Next.js server using a secret key
 * that is never exposed to the browser.
 */

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

/**
 * Encrypt shipping data by calling the server-side API route
 * The encryption key is kept secret on the server
 */
export async function encryptShippingData(data: ShippingData): Promise<string> {
  const response = await fetch("/api/encrypt-shipping", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to encrypt shipping data");
  }

  const result = await response.json();
  return result.encrypted;
}
