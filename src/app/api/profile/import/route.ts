import { createClient } from "@/lib/supabase/server";
import { AiError, MODEL_FAST, generateJson } from "@/server/ai/gemini";
import { consumeRun, errorResponse, getUser } from "@/server/ai/limits";
import { importSchema, importSystem, noLongDashes } from "@/server/ai/prompts";
import type { Contact, StructuredProfile } from "@/lib/profile";

export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

/** Reads an uploaded CV (PDF) into the structured profile. The file is never stored. */
export async function POST(request: Request) {
  const supabase = await createClient();
  try {
    await getUser(supabase);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AiError("Choose a PDF file first.", 400);
    if (file.type !== "application/pdf") throw new AiError("Please upload your CV as a PDF.", 400);
    if (file.size > MAX_BYTES) throw new AiError("That file is over 5 MB. Try a smaller PDF.", 400);

    await consumeRun(supabase, "import");
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const { data: result } = await generateJson<{ contact: Contact; cv_text: string; profile: StructuredProfile }>({
      model: MODEL_FAST(),
      system: importSystem,
      prompt: "Extract this CV into the JSON structure.",
      schema: importSchema,
      file: { data, mimeType: "application/pdf" },
    });
    if (!result?.profile || !result.contact || !Array.isArray(result.profile.experience)) {
      throw new AiError("Couldn't read that PDF. Is it a text PDF (not a scan)? You can also fill in your profile by hand.", 422);
    }
    return Response.json(noLongDashes(result));
  } catch (e) {
    return errorResponse(e);
  }
}
