import { NextRequest, NextResponse } from "next/server";
import { compactSections, parseHtmlToSections } from "@/lib/parse-html";
import { ApiInputError, jsonError, readJsonObject } from "@/lib/api-security";
import { fetchPublicText, SafeFetchError } from "@/lib/safe-url-fetch";
import { MAX_ANALYSIS_CHARACTERS, MAX_ANALYSIS_SECTIONS } from "@/lib/analysis-limits";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 2_048;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(req, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof ApiInputError) return jsonError(error.message, error.status);
    return jsonError("Invalid request", 400);
  }
  const { url } = body;

  if (typeof url !== "string" || url.length > 2_000) {
    return jsonError("Invalid URL", 400);
  }

  let html: string;
  try {
    ({ body: html } = await fetchPublicText(url));
  } catch (error) {
    if (error instanceof SafeFetchError) {
      if (error.code === "invalid_url" || error.code === "forbidden_target") {
        return jsonError("URL is not allowed", 400);
      }
      if (error.code === "response_too_large") {
        return jsonError("Remote document is too large", 413);
      }
      if (error.code === "unsupported_content") {
        return jsonError("URL does not return readable HTML content", 422);
      }
      if (error.code === "timeout") {
        return jsonError("Remote server timed out", 504);
      }
    }
    return jsonError("Could not fetch that URL", 502);
  }

  const parsedSections = parseHtmlToSections(html);
  const extractedCharacters = parsedSections.reduce((sum, section) => sum + section.content.length, 0);

  if (parsedSections.length === 0 || extractedCharacters < 100) {
    return NextResponse.json(
      { error: "Could not extract enough text from that page." },
      { status: 422 }
    );
  }

  if (extractedCharacters > MAX_ANALYSIS_CHARACTERS) {
    return jsonError("Extracted document is too large to analyze", 413);
  }

  const sections = compactSections(parsedSections, MAX_ANALYSIS_SECTIONS);

  return NextResponse.json(
    { sections },
    { headers: { "Cache-Control": "no-store" } },
  );
}
