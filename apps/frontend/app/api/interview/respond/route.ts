import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { transcript, scenarioId, history, isEval } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is required in .env.local" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Choose model and instructions based on whether we are evaluating or conversing
    const systemInstruction = isEval
      ? `The interview has concluded. Review the candidate's responses carefully. Provide a JSON object with strictly these keys:
         {
           "score": number (0-100),
           "summary": string (A one sentence spoken wrap-up to the candidate, e.g. "Thank you for your time today, here is your evaluation."),
           "strengths": [array of strings],
           "weaknesses": [array of strings],
           "feedback": string (Detailed final thoughts)
         }`
      : `You are an HR interviewer conducting a ${scenarioId} interview. Ask one focused follow-up question based on the candidate's last answer. Keep it under 2 sentences. Do not explain yourself.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction,
    });

    const contents = [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === "interviewer") {
          contents.push({ role: "model", parts: [{ text: msg.text }] });
        } else if (msg.role === "candidate" && msg.text.trim()) {
          contents.push({ role: "user", parts: [{ text: msg.text }] });
        }
      }
    }

    if (transcript) {
      contents.push({ role: "user", parts: [{ text: transcript }] });
    }

    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
        responseMimeType: isEval ? "application/json" : "text/plain",
      }
    });

    const responseText = result.response.text();

    if (isEval) {
      return NextResponse.json(JSON.parse(responseText.trim()));
    }

    return NextResponse.json({ question: responseText.trim() });
  } catch (error) {
    console.error("[interview/respond] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
