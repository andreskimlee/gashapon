import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source, message, data, timestamp } = body;
    
    // These logs will appear in Vercel's function logs
    console.log(`[DEBUG] [${source}] [${timestamp}] ${message}:`, 
      data ? JSON.stringify(data) : '');
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[DEBUG] Error parsing log:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
