import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      projectName,
      role,
      tokenAddress,
      marketCap,
      prizeIdeas,
      contact,
      additionalNotes,
    } = body;

    // Validate required fields
    if (!projectName || !role || !tokenAddress || !marketCap || !prizeIdeas || !contact) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from("partnership_applications")
      .insert({
        project_name: projectName,
        role,
        token_address: tokenAddress,
        market_cap: marketCap,
        prize_ideas: prizeIdeas,
        contact,
        additional_notes: additionalNotes || null,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      id: data.id,
    });
  } catch (error) {
    console.error("Partnership API error:", error);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 }
    );
  }
}
