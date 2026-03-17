import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  CreateAgentBody,
  GetAgentParams,
  SearchAgentsQueryParams,
} from "@workspace/api-zod";
import * as agentService from "../services/agent.service";
import * as verifyService from "../services/verify.service";
import * as hireService from "../services/hire.service";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });

// ── Agents ────────────────────────────────────────────────────────

router.get("/agents", async (_req, res): Promise<void> => {
  try {
    res.json(await agentService.listAgents());
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
    new URL(endpoint);
  } catch {
    res.status(400).json({ error: "Endpoint must be a valid URL" });
    return;
  }

  if (parsed.data.website) {
    try {
      new URL(parsed.data.website);
    } catch {
      res.status(400).json({ error: "Website must be a valid URL" });
      return;
    }
  }

  try {
    const ownerId = req.isAuthenticated() ? req.user.id : undefined;
    res.status(201).json(await agentService.createAgent(parsed.data, ownerId));
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
    const agent = await agentService.getAgentById(params.data.id);
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
    res.json(agent);
  } catch (err) {
    console.error("Failed to get agent:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Verification ──────────────────────────────────────────────────

router.post("/agents/:id/verify", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid agent ID" }); return; }

  try {
    const outcome = await verifyService.verifyAgentEndpoint(params.data.id);
    if (!outcome) { res.status(404).json({ error: "Agent not found" }); return; }
    if ("ssrfError" in outcome) { res.status(400).json({ error: `Endpoint not permitted: ${outcome.ssrfError}` }); return; }
    res.json({ reachable: outcome.result.reachable, statusCode: outcome.result.statusCode, agent: outcome.agent });
  } catch (err) {
    console.error("Failed to verify agent:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Request Proxy ─────────────────────────────────────────────────

router.post("/agents/:id/request", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid agent ID" }); return; }

  const bodyParsed = z.object({ payload: z.record(z.unknown()) }).safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Request body must have a 'payload' object" });
    return;
  }

  try {
    const outcome = await verifyService.proxyAgentRequest(params.data.id, bodyParsed.data.payload);
    if (!outcome) { res.status(404).json({ error: "Agent not found" }); return; }
    if ("ssrfError" in outcome) { res.status(400).json({ error: `Endpoint not permitted: ${outcome.ssrfError}` }); return; }
    res.json(outcome);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy failed";
    res.status(502).json({ error: message });
  }
});

// ── Hire Tracking ─────────────────────────────────────────────────

router.post("/agents/:id/hire", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid agent ID" }); return; }

  const body = z.object({
    channel: z.string().min(1),
    taskDescription: z.string().optional().nullable(),
    hirerName: z.string().optional().nullable(),
    budget: z.string().optional().nullable(),
  }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "channel is required" }); return; }

  try {
    const hire = await hireService.logHireRequest(params.data.id, body.data);
    if (!hire) { res.status(404).json({ error: "Agent not found" }); return; }
    res.status(201).json(hire);
  } catch (err) {
    console.error("Failed to log hire request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agents/:id/stats", async (req, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid agent ID" }); return; }

  try {
    const stats = await hireService.getAgentStats(params.data.id);
    if (!stats) { res.status(404).json({ error: "Agent not found" }); return; }
    res.json(stats);
  } catch (err) {
    console.error("Failed to get agent stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Search ────────────────────────────────────────────────────────

router.get("/search", async (req, res): Promise<void> => {
  const query = SearchAgentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  try {
    res.json(await agentService.searchAgents(query.data.q));
  } catch (err) {
    console.error("Failed to search agents:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
