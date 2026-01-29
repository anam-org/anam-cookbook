import { NextRequest } from "next/server";
import OpenAI from "openai";
import { systemPrompt } from "@/config/persona";

const openai = new OpenAI();

interface AnamMessage {
  role: "user" | "persona";
  content: string;
}

export async function POST(request: NextRequest) {
  const { messages } = (await request.json()) as { messages: AnamMessage[] };

  // Map Anam's "persona" role to OpenAI's "assistant" role
  const openaiMessages = messages.map((m) => ({
    role: m.role === "persona" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }, ...openaiMessages],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
