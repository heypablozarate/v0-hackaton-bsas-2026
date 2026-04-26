import { generateText, Output } from "ai";
import { z } from "zod";
import { analyzeText } from "@/lib/analyzer";

export const maxDuration = 60;

const VALIDATION_PROMPT = `You will receive a text. Determine if this is a Terms & Conditions document, privacy policy, legal agreement, end-user license agreement (EULA), or any kind of legal/contractual document. Answer ONLY with a JSON object: {"isLegal": true} or {"isLegal": false, "reason": "Brief explanation of what this text actually is"}. Be strict — marketing copy, blog posts, news articles, recipes, or any non-legal text should return false.`;

const ValidationSchema = z.object({
  isLegal: z.boolean(),
  reason: z.string().nullable(),
});

async function validateLegalText(text: string): Promise<{ isLegal: boolean; reason?: string }> {
  const { output } = await generateText({
    model: "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: VALIDATION_PROMPT },
      { role: "user", content: text.slice(0, 4000) },
    ],
    output: Output.object({ schema: ValidationSchema }),
  });
  return {
    isLegal: output?.isLegal ?? true,
    reason: output?.reason ?? undefined,
  };
}

const ParagraphSchema = z.object({
  original: z.string(),
  severity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  translation: z.string(),
  category: z.enum([
    "privacy",
    "control",
    "liability",
    "content_rights",
    "payments",
    "termination",
    "other",
  ]),
});

const ResponseSchema = z.object({
  clauses: z.array(ParagraphSchema),
});

function getSystemPrompt(language: string) {
  const lang = language === "es" ? "Spanish" : "English";
  return `You are a Terms & Conditions analyzer.

Analyze the legal text provided and return a JSON object with a "clauses" array where each element represents a paragraph or clause with:
- "original": the original text of that paragraph (copy it verbatim, do not truncate)
- "severity": a number from 1 to 5 where 1 is harmless and 5 is predatory/abusive
- "translation": a short, blunt, human-readable translation of what this paragraph actually means in plain language. Be direct and slightly sarcastic. Max 2 sentences. IMPORTANT: Write this translation in ${lang}.
- "category": one of "privacy", "control", "liability", "payments", "content_rights", "termination", "other"

Severity guide:
1 - Harmless, fair, or transparent language
2 - Mild concern, slightly one-sided
3 - Concerning, gives them significant power over you
4 - Bad, heavily favors them at your expense
5 - Predatory or abusive — you lose fundamental rights

Be honest and critical. Most T&C documents deserve high severity scores. Do not be generous. Split the text into logical clauses or paragraphs — do not return the entire text as one clause.`;
}

export async function POST(req: Request) {
  const { text, isMultiSection, language = "en" } = await req.json();

  // text can be a string (old single-text format) or array of strings (multi-section from URL)
  const sections: string[] = Array.isArray(text) ? text : [text];

  if (sections.length === 0 || sections.some((s) => !s || typeof s !== "string" || s.trim().length < 20)) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    // Step 1: validate the text is actually a legal document
    try {
      const { isLegal, reason } = await validateLegalText(sections.join("\n\n").slice(0, 6000));
      if (!isLegal) {
        return Response.json({ error: "not_legal", reason }, { status: 422 });
      }
    } catch {
      // If the validation call itself fails, skip and proceed with analysis
    }

    // Step 2: Analyze each section separately and collect all clauses
    const allParagraphs = [];

    for (const section of sections) {
      const { output: parsed } = await generateText({
        model: "openai/gpt-4o-mini",
        system: getSystemPrompt(language),
        messages: [{ role: "user", content: section }],
        output: Output.object({ schema: ResponseSchema }),
      });

      if (parsed && parsed.clauses && parsed.clauses.length > 0) {
        const sectionParagraphs = parsed.clauses.map((c) => ({
          text: c.original,
          severity: c.severity as 1 | 2 | 3 | 4 | 5,
          category: c.category,
          translation: c.translation,
          matches: [],
        }));
        allParagraphs.push(...sectionParagraphs);
      }
    }

    if (allParagraphs.length === 0) {
      throw new Error("No clauses extracted from any section");
    }

    return Response.json({ paragraphs: allParagraphs, source: "ai" });
  } catch (err) {
    console.error("[analyze] AI failed, falling back to local analyzer:", err);

    // Fallback: use the keyword-based local analyzer on all sections combined
    const combinedText = sections.join("\n\n");
    const paragraphs = analyzeText(combinedText, language);
    return Response.json({ paragraphs, source: "fallback" });
  }
}
