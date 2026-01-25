import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY; // Server-side only

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!ADMIN_API_KEY) {
    return NextResponse.json(
      { error: "Admin API key not configured on server" },
      { status: 500 }
    );
  }

  try {
    const { id } = await params;

    const response = await fetch(`${API_BASE_URL}/admin/games/${id}/activate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_API_KEY,
      },
      body: "{}",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin API error:", error);
    return NextResponse.json(
      { error: "Failed to activate game" },
      { status: 500 }
    );
  }
}
