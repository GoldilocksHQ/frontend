import { NextRequest, NextResponse } from "next/server";
import  { generateKey, getKey } from "../../../services/apiKeyServices";

export async function POST(req: NextRequest) {
  //Generate a new goldilocks api key for user
  try {
    const { action, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    switch(action) {
      case "generate-key":
        return handleGenerateKey(userId);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    
  }catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Retreive api key for user
  try {
    const { action } = await req.json();
    const { searchParams } = new URL(req.nextUrl);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    switch (action) {
      case "get-key":
        return handleGetKey(userId);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    
  }catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function handleGenerateKey(userId: string) {
  return generateKey(userId);
}

function handleGetKey(userId: string) {
  return getKey(userId);
}