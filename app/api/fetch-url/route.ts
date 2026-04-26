import { NextRequest, NextResponse } from "next/server";
import { parseHtmlToSections } from "@/lib/parse-html";

function isValidUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url } = body as { url?: string };

  if (!url || !isValidUrl(url)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TermsReader/1.0; +https://github.com/vercel)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `Remote server returned ${response.status}` },
      { status: 502 }
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isHtml = contentType.includes("text/html") || contentType.includes("text/plain");
  if (!isHtml) {
    return NextResponse.json(
      { error: "URL does not return readable HTML content" },
      { status: 422 }
    );
  }

  const html = await response.text();
  const sections = parseHtmlToSections(html);

  if (sections.length === 0 || sections.reduce((sum, s) => sum + s.content.length, 0) < 100) {
    return NextResponse.json(
      { error: "Could not extract enough text from that page." },
      { status: 422 }
    );
  }

  return NextResponse.json({ sections });
}
