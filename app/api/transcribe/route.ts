import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
    }

    const fd = await req.formData();
    const audioFile = fd.get("audio") as File | null;
    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "No audio clip provided" }, { status: 400 });
    }
    if (audioFile.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio clip exceeds 15 MB limit" }, { status: 413 });
    }

    const rawMime = (audioFile.type || "audio/webm").split(";")[0].trim().toLowerCase();
    const mimeType =
      rawMime === "audio/mp3"
        ? "audio/mpeg"
        : rawMime === "audio/m4a" || rawMime === "audio/x-m4a"
        ? "audio/mp4"
        : rawMime || "audio/webm";

    const buf = Buffer.from(await audioFile.arrayBuffer());
    const ai = new GoogleGenAI({ apiKey });

    const prompt =
      "Transcribe this construction site voice command verbatim in English/Hinglish. Use accurate construction vocabulary (wall, right wall, chhat, roof, slab, transfer girder, TG-03, crack, honeycombing, M50, escrow, QUADMAX, Project Vanguard). Return ONLY the plain spoken transcript with no quotes, markdown, or extra commentary. If no speech is audible, return an empty string.";

    for (const model of [process.env.GEMINI_FAST_MODEL || "gemini-4-hydrogen", "gemini-3.5-flash-lite", "gemini-3.8-flash"]) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { data: buf.toString("base64"), mimeType } },
                { text: prompt },
              ],
            },
          ],
        });
        const transcript = String(res.text || "")
          .trim()
          .replace(/^["']|["']$/g, "");
        return NextResponse.json({ ok: true, transcript, model });
      } catch (err: any) {
        console.warn(`[transcribe] ${model} failed:`, err?.message || err);
      }
    }

    return NextResponse.json({ error: "Audio transcription service unavailable" }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Transcription failed" }, { status: 500 });
  }
}
