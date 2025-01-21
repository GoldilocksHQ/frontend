import { NextRequest, NextResponse } from "next/server";
import { handleChatCompletion } from "@/services/api/agent-service";
import { withApiAuth } from "@/app/api/middleware";

export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const { model, messages, systemPrompt, selectedTools, userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const response = await handleChatCompletion(model, messages, systemPrompt, selectedTools , userId);
    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});