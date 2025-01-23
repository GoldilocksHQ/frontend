import { NextRequest, NextResponse } from "next/server";
import { handleChatCompletion, APIError } from "@/services/api/agent-service";
import { withApiAuth } from "@/app/api/middleware";

export const POST = withApiAuth(async (req: NextRequest) => {
  try {
    const { model, messages, systemPrompt, selectedTools, firstResponseFormat, userId } = await req.json();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', context: { reason: 'Missing userId' } },
        { status: 401 }
      );
    }

    const response = await handleChatCompletion(model, messages, systemPrompt, selectedTools, firstResponseFormat, userId);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Agent API Error:', error);

    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          error: error.message,
          context: error.context
        },
        { status: error.statusCode }
      );
    }

    // Handle JSON parse errors from req.json()
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          error: 'Invalid JSON in request body',
          context: { message: error.message }
        },
        { status: 400 }
      );
    }

    // Fallback error handler
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        context: { message: error instanceof Error ? error.message : String(error) }
      },
      { status: 500 }
    );
  }
});