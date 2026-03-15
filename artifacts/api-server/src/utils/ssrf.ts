import net from "node:net";
import dns from "node:dns/promises";

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && b === 51) return true;
    if (a === 203 && b === 0) return true;
    if (a === 240) return true;
    if (ip === "255.255.255.255") return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("::ffff:")) {
      const v4 = lower.slice(7);
      if (net.isIPv4(v4)) return isPrivateIp(v4);
    }
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("fe80")) return true;
    if (lower.startsWith("ff")) return true;
    return false;
  }
  return true;
}

export async function ssrfCheck(rawUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "Invalid URL";
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return "Only http and https protocols are permitted";
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host === "0.0.0.0") return "Blocked host";
  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    return "Blocked host";
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) return "Private/reserved IP address not permitted";
    return null;
  }

  try {
    const results = await dns.lookup(host, { all: true });
    for (const { address } of results) {
      if (isPrivateIp(address)) {
        return `Resolved IP ${address} is in a private/reserved range`;
      }
    }
  } catch {
    return "Hostname could not be resolved";
  }

  return null;
}
