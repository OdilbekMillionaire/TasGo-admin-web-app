import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_CLOUD_TRANSLATION_API_KEY")!;
const TRANSLATE_URL = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_API_KEY}`;

interface TranslateRequest {
  nameUzLatn: string;
  descriptionUzLatn?: string;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return "";
  const res = await fetch(TRANSLATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: "uz",
      target: targetLang,
      format: "text",
    }),
  });
  const data = await res.json();
  return data?.data?.translations?.[0]?.translatedText ?? text;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authResult = await verifyAuth(req);
    if (!authResult.success || authResult.role !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { nameUzLatn, descriptionUzLatn }: TranslateRequest = await req.json();

    if (!nameUzLatn) {
      return new Response(JSON.stringify({ error: "nameUzLatn is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Translate to uz (cyrillic), ru, en in parallel
    const [nameUzCyrl, nameRu, nameEn, descUzCyrl, descRu, descEn] = await Promise.all([
      translateText(nameUzLatn, "uz"), // Google returns Cyrillic for uz
      translateText(nameUzLatn, "ru"),
      translateText(nameUzLatn, "en"),
      descriptionUzLatn ? translateText(descriptionUzLatn, "uz") : Promise.resolve(""),
      descriptionUzLatn ? translateText(descriptionUzLatn, "ru") : Promise.resolve(""),
      descriptionUzLatn ? translateText(descriptionUzLatn, "en") : Promise.resolve(""),
    ]);

    return new Response(
      JSON.stringify({
        nameUzCyrl,
        nameRu,
        nameEn,
        descriptionUzCyrl: descUzCyrl || null,
        descriptionRu: descRu || null,
        descriptionEn: descEn || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
