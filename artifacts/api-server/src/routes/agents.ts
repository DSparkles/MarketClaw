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

const router: IRouter = Router();

router.get("/agents", async (_req, res): Promise<void> => {
  const agents = await db
    .select()
    .from(agentsTable)
    .orderBy(desc(agentsTable.createdAt));
  res.json(ListAgentsResponse.parse(agents));
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

  const [agent] = await db.insert(agentsTable).values(parsed.data).returning();

  res.status(201).json(GetAgentResponse.parse(agent));
});

router.get("/agents/:id", async (req, res): Promise<void> => {
  const params = GetAgentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, params.data.id));

  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  res.json(GetAgentResponse.parse(agent));
});

router.get("/search", async (req, res): Promise<void> => {
  const query = SearchAgentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

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
});

export default router;
