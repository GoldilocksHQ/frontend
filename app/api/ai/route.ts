import { NextRequest, NextResponse } from "next/server";
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();
    
    const completion = await openai.chat.completions.create({
      messages,
      model: model || "o1-mini",
    });

    return NextResponse.json({
      content: completion.choices[0]?.message?.content || '',
      role: completion.choices[0]?.message?.role || 'assistant',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}