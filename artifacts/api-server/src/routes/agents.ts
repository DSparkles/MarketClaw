import { Router, type IRouter } from "express";
import { eq, desc, or, ilike, count, sql } from "drizzle-orm";
import { db, agentsTable, hireRequestsTable } from "@workspace/db";
import {
  CreateAgentBody,
  GetAgentParams,
  GetAgentResponse,
  ListAgentsResponse,
  SearchAgentsQueryParams,
  SearchAgentsResponse,
} from "@workspace/api-zod";
import { z } from "zod";
import dns from "node:dns/promises";
import net from "node:net";

const router: IRouter = Router();

const MAX_RESPONSE_BYTES = 1 * 1024 * 1024; // 1 MB cap on upstream responses

/**
 * Returns true if the given IP address is in a private/restricted range.
 * Covers: loopback, RFC1918, link-local/metadata, IPv6 special ranges.
 */
function isPrivateIp(ip: string): boolean {
  // IPv4
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0) return true;                             // 0.0.0.0/8
    if (a === 10) return true;                            // 10.0.0.0/8
    if (a === 127) return true;                           // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true;              // 169.254.0.0/16 link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;    // 172.16.0.0/12
    if (a === 192 && b === 168) return true;              // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true;   // 100.64.0.0/10 shared address space
    if (a === 198 && b === 51) return true;               // 198.51.100.0/24 documentation
    if (a === 203 && b === 0) return true;                // 203.0.113.0/24 documentation
    if (a === 240) return true;                           // 240.0.0.0/4 reserved
    if (ip === "255.255.255.255") return true;
    return false;
  }
  // IPv6
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;                     // loopback
    if (lower.startsWith("::ffff:")) {
      // IPv4-mapped: check the embedded IPv4
      const v4 = lower.slice(7);
      if (net.isIPv4(v4)) return isPrivateIp(v4);
    }
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
    if (lower.startsWith("fe80")) return true;           // link-local
    if (lower.startsWith("ff")) return true;             // multicast
    return false;
  }
  return true; // unknown format — block by default
}

/**
 * Full SSRF protection check. Validates the URL structurally then resolves
 * the hostname via DNS and verifies the resulting IP is public.
 * Returns an error string if blocked, null if safe to proceed.
 */
async function ssrfCheck(rawUrl: string): Promise<string | null> {
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

  // Block by hostname before DNS (catches common cases fast)
  if (host === "localhost" || host === "0.0.0.0") return "Blocked host";
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return "Blocked host";
  }

  // If hostname already looks like a raw IP, check it directly
  if (net.isIP(host)) {
    if (isPrivateIp(host)) return "Private/reserved IP address not permitted";
    return null;
  }

  // Resolve DNS and check each returned address
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

/**
 * Read a Response body up to MAX_RESPONSE_BYTES, returning null if limit exceeded.
 */
async function readCapped(res: Response): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) {
    return await res.text();
  }
  const decoder = new TextDecoder();
  let result = "";
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      return null;
    }
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

router.get("/agents", async (_req, res): Promise<void> => {
  try {
    const agents = await db
      .select()
      .from(agentsTable)
      .orderBy(desc(agentsTable.createdAt));
    res.json(ListAgentsResponse.parse(agents));
  } catch (err) {
    console.error("Failed to list agents:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/agents", async (req, res): Promise<void> => {
  const parsed = CreateAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { agentName, serviceTitle, description, tags, endpoint } = parsed.data;
  if (!agentName.trim() || !serviceTitle.trim() || !description.trim() || !tags.trim() || !endpoint.trim()) {
    res.status(400).json({ error: "Required fields cannot be empty" });
    return;
  }

  try {
    const url = new URL(endpoint);
    if (!["http:", "https:"].includes(url.protocol)) {
      res.status(400).json({ error: "Endpoint must use http or https protocol" });
      return;
    }
  } catch {
    res.status(400).json({ error: "Endpoint must be a valid URL" });
    return;
  }

  if (parsed.data.website) {
    try {
      const url = new URL(parsed.data.website);
      if (!["http:", "https:"].includes(url.protocol)) {
        res.status(400).json({ error: "Website must use http or https protocol" });
        return;
      }
    } catch {
      res.status(400).json({ error: "Website must be a valid URL" });
      return;
    }
  }

  try {
    const [agent] = await db.insert(agentsTable).values(parsed.data).returning();
    res.status(201).json(GetAgentResponse.parse(agent));
  } catch (err) {
    console.error("Failed to create agent:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agents/:id", async (req, res): Promise<void> => {
  const params = GetAgentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, params.data.id));

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    res.json(GetAgentResponse.parse(agent));
  } catch (err) {
    console.error("Failed to get agent:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const IdParam = z.object({ id: z.coerce.number().int().positive() });

router.post("/agents/:id/verify", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid agent ID" });
    return;
  }

  try {
    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, params.data.id));

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const ssrfError = await ssrfCheck(agent.endpoint);
    if (ssrfError) {
      res.status(400).json({ error: `Endpoint not permitted: ${ssrfError}` });
      return;
    }

    let reachable = false;
    let statusCode: number | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(agent.endpoint, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "error",
        headers: { "User-Agent": "MarketClaw-Verify/1.0" },
      });
      clearTimeout(timeout);
      statusCode = response.status;
      reachable = response.status < 500;
    } catch {
      reachable = false;
    }

    let updatedAgent = agent;
    if (reachable) {
      const [updated] = await db
        .update(agentsTable)
        .set({ verifiedAt: new Date() })
        .where(eq(agentsTable.id, params.data.id))
        .returning();
      if (updated) updatedAgent = updated;
    }

    res.json({ reachable, statusCode, agent: GetAgentResponse.parse(updatedAgent) });
  } catch (err) {
    console.error("Failed to verify agent:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/agents/:id/request", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid agent ID" });
    return;
  }

  const bodyParsed = z.object({ payload: z.record(z.unknown()) }).safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Request body must have a 'payload' object" });
    return;
  }

  try {
    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, params.data.id));

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const ssrfError = await ssrfCheck(agent.endpoint);
    if (ssrfError) {
      res.status(400).json({ error: `Endpoint not permitted: ${ssrfError}` });
      return;
    }

    const start = Date.now();
    let agentRes: Response;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      agentRes = await fetch(agent.endpoint, {
        method: "POST",
        signal: controller.signal,
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MarketClaw-Proxy/1.0",
          "X-MarketClaw-Request": "true",
        },
        body: JSON.stringify(bodyParsed.data.payload),
      });
      clearTimeout(timeout);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      res.status(502).json({ error: `Could not reach agent endpoint: ${message}` });
      return;
    }

    const durationMs = Date.now() - start;
    const rawBody = await readCapped(agentRes);

    if (rawBody === null) {
      res.status(502).json({ error: "Agent response exceeded the 1 MB size limit" });
      return;
    }

    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      body = {};
    }

    res.json({
      statusCode: agentRes.status,
      body,
      rawBody,
      durationMs,
    });
  } catch (err) {
    console.error("Failed to proxy agent request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/agents/:id/hire", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid agent ID" });
    return;
  }

  const body = z.object({
    channel: z.string().min(1),
    taskDescription: z.string().optional().nullable(),
    hirerName: z.string().optional().nullable(),
    budget: z.string().optional().nullable(),
  }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "channel is required" });
    return;
  }

  try {
    const [agent] = await db.select({ id: agentsTable.id }).from(agentsTable).where(eq(agentsTable.id, params.data.id));
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const [hire] = await db.insert(hireRequestsTable).values({
      agentId: params.data.id,
      channel: body.data.channel,
      taskDescription: body.data.taskDescription ?? null,
      hirerName: body.data.hirerName ?? null,
      budget: body.data.budget ?? null,
    }).returning();

    res.status(201).json(hire);
  } catch (err) {
    console.error("Failed to log hire request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agents/:id/stats", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid agent ID" });
    return;
  }

  try {
    const [agent] = await db.select({ id: agentsTable.id }).from(agentsTable).where(eq(agentsTable.id, params.data.id));
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const rows = await db
      .select({ channel: hireRequestsTable.channel, cnt: count() })
      .from(hireRequestsTable)
      .where(eq(hireRequestsTable.agentId, params.data.id))
      .groupBy(hireRequestsTable.channel);

    const channelBreakdown: Record<string, number> = {};
    let hireCount = 0;
    for (const row of rows) {
      const n = Number(row.cnt);
      channelBreakdown[row.channel] = n;
      hireCount += n;
    }

    res.json({ agentId: params.data.id, hireCount, channelBreakdown });
  } catch (err) {
    console.error("Failed to get agent stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/search", async (req, res): Promise<void> => {
  const query = SearchAgentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  try {
    const q = `%${query.data.q}%`;
    const agents = await db
      .select()
      .from(agentsTable)
      .where(
        or(
          ilike(agentsTable.tags, q),
          ilike(agentsTable.description, q),
          ilike(agentsTable.agentName, q),
          ilike(agentsTable.serviceTitle, q)
        )
      )
      .orderBy(desc(agentsTable.createdAt));

    res.json(SearchAgentsResponse.parse(agents));
  } catch (err) {
    console.error("Failed to search agents:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
