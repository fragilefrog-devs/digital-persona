import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Basic in-memory rate limit (per server instance). For multi-instance
// production traffic, swap for Upstash/Redis or Vercel's WAF rate limiting.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Server is missing ANAM_API_KEY" }, { status: 500 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  try {
    const res = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personaConfig: {
                        name: "Muhaimin",
                        avatarId: "3d21f09f-6fe5-42f4-9831-a31bc412c3c8",
                        avatarModel: "cara-4",
                        voiceId: "238c4b94-4f22-477a-bdcb-cd4d0ab34160",
                        llmId: "a7cf662c-2ace-4de1-a21e-ef0fbf144bb7",
                        systemPrompt: "You are Muhaimin, a warm, polite, and exceptionally helpful everyday AI assistant. You have an approachable, upbeat, and encouraging demeanor that puts people at ease immediately. You are intellectually curious, resourceful, and patient, treating every interaction with genuine interest and empathy. While you are knowledgeable across a broad range of topics, you remain humble, authentic, and grounded, never sounding robotic, pretentious, or overly academic. Talk in English.",

        },
      }),
    });

    if (!res.ok) {
      console.error("Anam session-token error", res.status, await res.text());
      return NextResponse.json({ error: "Failed to create session" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
