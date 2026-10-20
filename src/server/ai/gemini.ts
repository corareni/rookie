import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export class AiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;
function ai() {
  if (!process.env.GEMINI_API_KEY) throw new AiError("AI isn't set up yet.", 503);
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export const MODEL_FAST = () => process.env.AI_MODEL_FAST || "gemini-3.5-flash-lite";
export const MODEL_WRITE = () => process.env.AI_MODEL_WRITE || "gemini-3.6-flash";

const ATTEMPT_MS = 25_000;

/** Pulls the first JSON object out of a model reply (tolerates code fences or stray text). */
function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new AiError("The AI reply wasn't in the expected format. Try again.", 502);
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    throw new AiError("The AI reply wasn't in the expected format. Try again.", 502);
  }
}

function mapError(e: unknown): never {
  if (e instanceof AiError) throw e;
  const msg = e instanceof Error ? e.message : String(e);
  if (/429|503|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|overloaded|quota|rate|abort/i.test(msg))
    throw new AiError("Rookie is busy, try again in a minute.", 429);
  console.error("Gemini error:", msg);
  throw new AiError("The AI couldn't finish this one. Try again.", 502);
}

/**
 * Asks Gemini for JSON. With `readUrls`, Gemini's URL context tool reads the listing first;
 * tools and schema-enforced output don't always combine, so in that case the schema goes in the prompt.
 */
/** Overloaded, rate-limited or too slow: worth one more try on the fast model. */
const retryable = (e: unknown) =>
  /429|500|503|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand|overloaded|abort|timed? ?out/i.test(
    e instanceof Error ? e.message : String(e),
  );

export async function generateJson<T>(opts: {
  model: string;
  system: string;
  prompt: string;
  schema: object;
  readUrls?: boolean;
  /** A document to read first, e.g. an uploaded CV (base64). */
  file?: { data: string; mimeType: string };
}): Promise<{ data: T; urlFailed: boolean }> {
  const models = [...new Set([opts.model, MODEL_FAST()])];
  let last: unknown;
  for (const model of models) {
    try {
      const res = await ai().models.generateContent({
        model,
        contents: opts.file
          ? [{ role: "user", parts: [{ inlineData: opts.file }, { text: opts.prompt }] }]
          : opts.readUrls
            ? `${opts.prompt}\n\nReply with ONLY a JSON object matching this JSON Schema:\n${JSON.stringify(opts.schema)}`
            : opts.prompt,
        config: {
          systemInstruction: opts.system,
          temperature: 0.4,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(ATTEMPT_MS),
          ...(opts.readUrls
            ? { tools: [{ urlContext: {} }] }
            : { responseMimeType: "application/json", responseJsonSchema: opts.schema }),
        },
      });
      const meta = res.candidates?.[0]?.urlContextMetadata?.urlMetadata ?? [];
      const urlFailed =
        !!opts.readUrls &&
        (meta.length === 0 || meta.every((m) => !String(m.urlRetrievalStatus ?? "").includes("SUCCESS")));
      return { data: parseJson<T>(res.text ?? ""), urlFailed };
    } catch (e) {
      last = e;
      if (!retryable(e)) break;
      console.warn(`Gemini ${model} failed, trying the next model:`, e instanceof Error ? e.message.slice(0, 160) : e);
    }
  }
  mapError(last);
}
