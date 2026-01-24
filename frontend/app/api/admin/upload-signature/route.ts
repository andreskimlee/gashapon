import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY; // Server-side only

export async function GET(request: NextRequest) {
  if (!ADMIN_API_KEY) {
    return NextResponse.json(
      { error: "Admin API key not configured on server" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["game", "prize"].includes(type)) {
      return NextResponse.json(
        { error: "Query param 'type' must be 'game' or 'prize'" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/games/upload-signature?type=${type}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Upload signature error:", error);
    return NextResponse.json(
      { error: "Failed to get upload signature" },
      { status: 500 }
    );
  }
}
