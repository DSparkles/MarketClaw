import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, agentsTable, hireRequestsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });

router.get("/dashboard/agents", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const owned = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.ownerId, req.user.id));

    const agentIds = owned.map((a) => a.id);
    const hireCounts: Record<number, number> = {};
    if (agentIds.length > 0) {
      const hires = await db
        .select()
        .from(hireRequestsTable)
        .where(inArray(hireRequestsTable.agentId, agentIds));
      for (const h of hires) {
        hireCounts[h.agentId] = (hireCounts[h.agentId] ?? 0) + 1;
      }
    }

    res.json(
      owned.map((a) => ({
        id: a.id,
        agentName: a.agentName,
        serviceTitle: a.serviceTitle,
        tags: a.tags,
        price: a.price,
        endpoint: a.endpoint,
        telegram: a.telegram,
        discord: a.discord,
        contactEmail: a.contactEmail,
        paymentLink: a.paymentLink,
        createdAt: a.createdAt,
        verifiedAt: a.verifiedAt,
        hireCount: hireCounts[a.id] ?? 0,
      }))
    );
  } catch (err) {
    console.error("Dashboard agents error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/dashboard/agents/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid agent ID" });
    return;
  }
  try {
    const [agent] = await db
      .select({ id: agentsTable.id, ownerId: agentsTable.ownerId })
      .from(agentsTable)
      .where(eq(agentsTable.id, params.data.id));

    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    if (agent.ownerId !== req.user.id) {
      res.status(403).json({ error: "Forbidden — not the owner" });
      return;
    }

    await db.delete(agentsTable).where(
      and(eq(agentsTable.id, params.data.id), eq(agentsTable.ownerId, req.user.id))
    );
    res.status(204).send();
  } catch (err) {
    console.error("Dashboard delete agent error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/hire-requests", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const owned = await db
      .select({ id: agentsTable.id })
      .from(agentsTable)
      .where(eq(agentsTable.ownerId, req.user.id));

    const agentIds = owned.map((a) => a.id);
    if (agentIds.length === 0) {
      res.json([]);
      return;
    }

    const hires = await db
      .select()
      .from(hireRequestsTable)
      .where(inArray(hireRequestsTable.agentId, agentIds))
      .orderBy(hireRequestsTable.createdAt);

    res.json(hires);
  } catch (err) {
    console.error("Dashboard hire-requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
