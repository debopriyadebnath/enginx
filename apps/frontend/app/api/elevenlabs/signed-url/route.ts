import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

/**
 * Creates a short-lived signed WebSocket URL for ElevenLabs Conversational AI.
 * Requires `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` (agent configured in ElevenLabs dashboard).
 */
export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    return NextResponse.json(
      {
        error:
          "Server missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID. Add them to .env.local.",
      },
      { status: 503 }
    );
  }

  try {
    const client = new ElevenLabsClient({ apiKey });
    const res = await client.conversationalAi.conversations.getSignedUrl({
      agentId,
      includeConversationId: true,
    });
    return NextResponse.json({ signedUrl: res.signedUrl });
  } catch (e) {
    console.error("[elevenlabs/signed-url]", e);
    return NextResponse.json(
      { error: "Could not create signed URL. Check API key and agent id." },
      { status: 502 }
    );
  }
}
