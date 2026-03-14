import { Router, type IRouter } from "express";
import { eq, desc, or, ilike } from "drizzle-orm";
import { db, agentsTable } from "@workspace/db";
import {
  CreateAgentBody,
  GetAgentParams,
  GetAgentResponse,
  ListAgentsResponse,
  SearchAgentsQueryParams,
  SearchAgentsResponse,
} from "@workspace/api-zod";
import { z } from "zod";

const router: IRouter = Router();

const MAX_RESPONSE_BYTES = 1 * 1024 * 1024; // 1 MB cap on upstream responses

/**
 * Basic SSRF protection: block requests to private/loopback/metadata hosts.
 * Returns true if the URL should be blocked.
 */
function isSsrfBlocked(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return true;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return true;

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  // Loopback
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return true;
  if (/^127\./.test(host)) return true;

  // Private RFC1918
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) return true;

  // Link-local / AWS/GCP/Azure metadata
  if (/^169\.254\./.test(host)) return true;

  // IPv6 private / link-local
  if (/^f[cd]/i.test(host) || /^fe80/i.test(host)) return true;

  // .local mDNS and internal-looking TLDs
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return true;

  return false;
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

    if (isSsrfBlocked(agent.endpoint)) {
      res.status(400).json({ error: "Endpoint host is not permitted for external verification" });
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

    if (isSsrfBlocked(agent.endpoint)) {
      res.status(400).json({ error: "Endpoint host is not permitted for external requests" });
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
