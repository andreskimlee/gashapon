import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      category,
      walletAddress,
      subject,
      message,
    } = body;

    // Validate required fields
    if (!name || !email || !category || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        name,
        email,
        category,
        wallet_address: walletAddress || null,
        subject,
        message,
        status: "open",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to submit ticket" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Support ticket submitted successfully",
      id: data.id,
    });
  } catch (error) {
    console.error("Support API error:", error);
    return NextResponse.json(
      { error: "Failed to process ticket" },
      { status: 500 }
    );
  }
}
