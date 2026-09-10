import { describe, expect, it } from "vitest";
import { ApiInputError, readJsonObject } from "./api-security";
import { compactSections } from "./parse-html";
import { MAX_ANALYSIS_SECTIONS } from "./analysis-limits";
import {
  isPublicAddress,
  isReadableContentType,
  fetchPublicText,
  resolvePublicTarget,
  SafeFetchError,
  validateTargetUrl,
} from "./safe-url-fetch";

describe("safe URL targets", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "192.168.1.1",
    "198.51.100.2",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "64:ff9b::a9fe:a9fe",
  ])("blocks non-public address %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])(
    "allows public address %s",
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );

  it.each([
    "file:///etc/passwd",
    "http://user:secret@example.com",
    "https://example.com:8443/terms",
    "http://localhost/terms",
    "http://127.1/terms",
    "http://2130706433/terms",
    "http://0x7f000001/terms",
    "http://0177.0.0.1/terms",
    "http://[::ffff:127.0.0.1]/terms",
  ])("rejects unsafe URL form %s", (raw) => {
    expect(() => validateTargetUrl(raw)).toThrow(SafeFetchError);
  });

  it("rejects a hostname when any DNS answer is private", async () => {
    await expect(
      resolvePublicTarget("https://example.com/terms", async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ]),
    ).rejects.toMatchObject({ code: "forbidden_target" });
  });

  it("accepts and preserves a public HTTPS URL", async () => {
    const result = await resolvePublicTarget("https://example.com/terms", async () => [
      { address: "93.184.216.34", family: 4 },
    ]);
    expect(result.url.toString()).toBe("https://example.com/terms");
    expect(result.addresses).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });

  it("revalidates every redirect target before the next request", async () => {
    const requestedHosts: string[] = [];
    const resolvedHosts: string[] = [];

    await expect(
      fetchPublicText("https://public.example/terms", {
        resolveHost: async (hostname) => {
          resolvedHosts.push(hostname);
          return hostname === "public.example"
            ? [{ address: "93.184.216.34", family: 4 }]
            : [{ address: "127.0.0.1", family: 4 }];
        },
        requestOnce: async (url) => {
          requestedHosts.push(url.hostname);
          return {
            status: 302,
            contentType: "text/html",
            location: "http://internal.example/private",
            body: "",
          };
        },
      }),
    ).rejects.toMatchObject({ code: "forbidden_target" });

    expect(resolvedHosts).toEqual(["public.example", "internal.example"]);
    expect(requestedHosts).toEqual(["public.example"]);
  });

  it("allows a bounded public-to-public redirect", async () => {
    const result = await fetchPublicText("https://old.example/terms", {
      resolveHost: async () => [{ address: "93.184.216.34", family: 4 }],
      requestOnce: async (url) =>
        url.hostname === "old.example"
          ? {
              status: 301,
              contentType: "text/html",
              location: "https://new.example/terms",
              body: "",
            }
          : {
              status: 200,
              contentType: "text/html; charset=utf-8",
              location: null,
              body: "<p>These terms remain readable.</p>",
            },
    });

    expect(result.finalUrl.toString()).toBe("https://new.example/terms");
    expect(result.body).toContain("terms remain readable");
  });

  it("includes DNS resolution in the total timeout", async () => {
    await expect(
      fetchPublicText("https://slow-dns.example/terms", {
        timeoutMs: 10,
        resolveHost: () => new Promise(() => undefined),
      }),
    ).rejects.toMatchObject({ code: "timeout" });
  });

  it.each(["text/html", "text/html; charset=utf-8", "text/plain"])(
    "accepts exact readable media type %s",
    (contentType) => expect(isReadableContentType(contentType)).toBe(true),
  );

  it.each(["text/htmlfoo", "application/octet-stream; note=text/html", "application/json"])(
    "rejects misleading media type %s",
    (contentType) => expect(isReadableContentType(contentType)).toBe(false),
  );
});

describe("bounded JSON input", () => {
  it("parses a legitimate JSON object", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "A sufficiently long legal clause." }),
    });
    await expect(readJsonObject(request, 1_024)).resolves.toEqual({
      text: "A sufficiently long legal clause.",
    });
  });

  it("rejects a streamed body after the actual byte limit", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(100) }),
    });
    await expect(readJsonObject(request, 32)).rejects.toBeInstanceOf(ApiInputError);
  });

  it("rejects non-JSON content", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });
    await expect(readJsonObject(request, 1_024)).rejects.toMatchObject({ status: 415 });
  });
});

describe("URL section compaction", () => {
  it("keeps every heading and body while bounding AI calls", () => {
    const source = Array.from({ length: 17 }, (_, index) => ({
      title: `Clause ${index + 1}`,
      content: `Body ${index + 1}`,
    }));
    const compacted = compactSections(source, MAX_ANALYSIS_SECTIONS);
    const reconstructed = compacted
      .map((section) => `${section.title}\n\n${section.content}`)
      .join("\n\n");

    expect(compacted.length).toBeLessThanOrEqual(MAX_ANALYSIS_SECTIONS);
    for (const section of source) {
      expect(reconstructed).toContain(section.title);
      expect(reconstructed).toContain(section.content);
    }
  });
});
