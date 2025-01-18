import { NextRequest, NextResponse } from "next/server";
import { handleChatCompletion } from "@/services/api/ai-service";
import { getUser } from "@/services/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { messages, model, selectedTools } = await req.json();
    
    const response = await handleChatCompletion(messages, model, selectedTools, user.id);
    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}