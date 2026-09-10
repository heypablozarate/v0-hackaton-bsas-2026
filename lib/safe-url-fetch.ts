import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const ALLOWED_PORTS = new Set(["", "80", "443"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_MAX_REDIRECTS = 3;

const blockedIpv4Addresses = new BlockList();
const blockedIpv6Addresses = new BlockList();

for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.31.196.0", 24],
  ["192.52.193.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["192.175.48.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIpv4Addresses.addSubnet(address, prefix, "ipv4");
}

for (const [address, prefix] of [
  ["::", 96],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3ffe::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedIpv6Addresses.addSubnet(address, prefix, "ipv6");
}

export class SafeFetchError extends Error {
  constructor(
    readonly code:
      | "invalid_url"
      | "forbidden_target"
      | "dns_failure"
      | "timeout"
      | "too_many_redirects"
      | "remote_error"
      | "unsupported_content"
      | "response_too_large",
    message: string,
  ) {
    super(message);
    this.name = "SafeFetchError";
  }
}

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

type ResolveHost = (hostname: string) => Promise<ResolvedAddress[]>;

export function isPublicAddress(address: string, family = isIP(address)): boolean {
  if (family === 4) return !blockedIpv4Addresses.check(address, "ipv4");
  if (family === 6) return !blockedIpv6Addresses.check(address, "ipv6");
  return false;
}

export function validateTargetUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeFetchError("invalid_url", "Invalid URL");
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    !ALLOWED_PORTS.has(url.port) ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new SafeFetchError("invalid_url", "URL scheme, port, or credentials are not allowed");
  }

  const urlHostname = url.hostname.replace(/\.$/, "").toLowerCase();
  const hostname =
    urlHostname.startsWith("[") && urlHostname.endsWith("]")
      ? urlHostname.slice(1, -1)
      : urlHostname;
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new SafeFetchError("forbidden_target", "Target is not public");
  }

  const literalFamily = isIP(hostname);
  if (literalFamily !== 0 && !isPublicAddress(hostname, literalFamily)) {
    throw new SafeFetchError("forbidden_target", "Target is not public");
  }

  if (literalFamily === 0) url.hostname = hostname;
  return url;
}

export async function resolvePublicTarget(
  raw: string,
  resolveHost: ResolveHost = async (hostname) =>
    (await dnsLookup(hostname, { all: true, verbatim: true })) as ResolvedAddress[],
): Promise<{ url: URL; addresses: ResolvedAddress[] }> {
  const url = validateTargetUrl(raw);
  const hostname = url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname;
  const literalFamily = isIP(hostname);

  let addresses: ResolvedAddress[];
  try {
    addresses = literalFamily
      ? [{ address: hostname, family: literalFamily as 4 | 6 }]
      : await resolveHost(hostname);
  } catch {
    throw new SafeFetchError("dns_failure", "Could not resolve target");
  }

  if (
    addresses.length === 0 ||
    addresses.some(
      ({ address, family }) =>
        (family !== 4 && family !== 6) || !isPublicAddress(address, family),
    )
  ) {
    throw new SafeFetchError("forbidden_target", "Target is not public");
  }

  return { url, addresses };
}

function pinnedLookup(addresses: ResolvedAddress[]): LookupFunction {
  return (_hostname, options, callback) => {
    if (typeof options === "object" && options.all) {
      callback(null, addresses);
      return;
    }

    const preferredFamily =
      typeof options === "number"
        ? options
        : typeof options === "object" && typeof options.family === "number"
          ? options.family
          : 0;
    const selected =
      addresses.find(({ family }) => preferredFamily === 0 || family === preferredFamily) ??
      addresses[0];
    callback(null, selected.address, selected.family);
  };
}

interface FetchPublicTextOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  resolveHost?: ResolveHost;
  requestOnce?: typeof requestOnce;
}

interface RemoteResponse {
  status: number;
  contentType: string;
  location: string | null;
  body: string;
}

export function isReadableContentType(contentType: string): boolean {
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  return mediaType === "text/html" || mediaType === "text/plain";
}

async function resolveBeforeDeadline(
  raw: string,
  resolveHost: ResolveHost | undefined,
  remainingMs: number,
): Promise<{ url: URL; addresses: ResolvedAddress[] }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      resolvePublicTarget(raw, resolveHost),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new SafeFetchError("timeout", "Remote request timed out")),
          Math.max(1, remainingMs),
        );
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function requestOnce(
  url: URL,
  addresses: ResolvedAddress[],
  remainingMs: number,
  maxBytes: number,
): Promise<RemoteResponse> {
  return new Promise((resolve, reject) => {
    const requestImpl = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = requestImpl(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": "TermsReader/1.0 (+https://v0-feel-the-terms.vercel.app)",
          Accept: "text/html,text/plain;q=0.9",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "identity",
        },
        lookup: pinnedLookup(addresses),
        signal: AbortSignal.timeout(Math.max(1, remainingMs)),
      },
      (response) => {
        const status = response.statusCode ?? 502;
        const contentType = String(response.headers["content-type"] ?? "");
        const location = response.headers.location ?? null;

        if (REDIRECT_STATUSES.has(status) && location) {
          response.resume();
          resolve({ status, contentType, location, body: "" });
          return;
        }

        const contentEncoding = String(response.headers["content-encoding"] ?? "identity");
        if (contentEncoding !== "identity") {
          response.destroy();
          reject(new SafeFetchError("unsupported_content", "Compressed responses are not accepted"));
          return;
        }

        const declaredLength = Number(response.headers["content-length"] ?? 0);
        if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
          response.destroy();
          reject(new SafeFetchError("response_too_large", "Remote response is too large"));
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;
        response.on("data", (chunk: Buffer) => {
          totalBytes += chunk.byteLength;
          if (totalBytes > maxBytes) {
            response.destroy(new SafeFetchError("response_too_large", "Remote response is too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({
            status,
            contentType,
            location,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        response.on("error", reject);
      },
    );

    request.on("error", (error) => {
      if (error instanceof SafeFetchError) {
        reject(error);
      } else if (error.name === "AbortError" || error.name === "TimeoutError") {
        reject(new SafeFetchError("timeout", "Remote request timed out"));
      } else {
        reject(new SafeFetchError("remote_error", "Remote request failed"));
      }
    });
    request.end();
  });
}

export async function fetchPublicText(
  raw: string,
  options: FetchPublicTextOptions = {},
): Promise<{ body: string; contentType: string; finalUrl: URL }> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const deadline = Date.now() + timeoutMs;
  let currentUrl = raw;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new SafeFetchError("timeout", "Remote request timed out");
    }

    const { url, addresses } = await resolveBeforeDeadline(
      currentUrl,
      options.resolveHost,
      remainingMs,
    );
    const requestRemainingMs = deadline - Date.now();
    if (requestRemainingMs <= 0) {
      throw new SafeFetchError("timeout", "Remote request timed out");
    }
    const response = await (options.requestOnce ?? requestOnce)(
      url,
      addresses,
      requestRemainingMs,
      maxBytes,
    );

    if (REDIRECT_STATUSES.has(response.status) && response.location) {
      if (redirectCount === maxRedirects) {
        throw new SafeFetchError("too_many_redirects", "Too many redirects");
      }
      currentUrl = new URL(response.location, url).toString();
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new SafeFetchError("remote_error", `Remote server returned ${response.status}`);
    }

    if (!isReadableContentType(response.contentType)) {
      throw new SafeFetchError("unsupported_content", "URL does not return readable text");
    }

    return { body: response.body, contentType: response.contentType, finalUrl: url };
  }

  throw new SafeFetchError("too_many_redirects", "Too many redirects");
}
