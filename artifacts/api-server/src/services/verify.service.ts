import { eq } from "drizzle-orm";
import { db, agentsTable } from "@workspace/db";
import { GetAgentResponse } from "@workspace/api-zod";
import { ssrfCheck } from "../utils/ssrf";
import { readCapped } from "../utils/http";
import { HTTP_LIMITS } from "../config";
import type { VerifyResult, ProxyResult } from "../models/agent";
import type { z } from "zod";

export async function verifyAgentEndpoint(
  agentId: number
): Promise<{ result: VerifyResult; agent: z.infer<typeof GetAgentResponse> } | { ssrfError: string } | null> {
  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, agentId));

  if (!agent) return null;

  const ssrfError = await ssrfCheck(agent.endpoint);
  if (ssrfError) return { ssrfError };

  let reachable = false;
  let statusCode: number | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_LIMITS.verifyTimeoutMs);
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
      .where(eq(agentsTable.id, agentId))
      .returning();
    if (updated) updatedAgent = updated;
  }

  return {
    result: { reachable, statusCode },
    agent: GetAgentResponse.parse(updatedAgent),
  };
}

export async function proxyAgentRequest(
  agentId: number,
  payload: Record<string, unknown>
): Promise<ProxyResult | { ssrfError: string } | null> {
  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, agentId));

  if (!agent) return null;

  const ssrfError = await ssrfCheck(agent.endpoint);
  if (ssrfError) return { ssrfError };

  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_LIMITS.proxyTimeoutMs);

  let agentRes: Response;
  try {
    agentRes = await fetch(agent.endpoint, {
      method: "POST",
      signal: controller.signal,
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "MarketClaw-Proxy/1.0",
        "X-MarketClaw-Request": "true",
      },
      body: JSON.stringify(payload),
    });
    clearTimeout(timeout);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed";
    throw new Error(`Could not reach agent endpoint: ${message}`);
  }

  const durationMs = Date.now() - start;
  const rawBody = await readCapped(agentRes);

  if (rawBody === null) {
    throw new Error("Agent response exceeded the 1 MB size limit");
  }

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    body = {};
  }

  return { statusCode: agentRes.status, body, rawBody, durationMs };
}
