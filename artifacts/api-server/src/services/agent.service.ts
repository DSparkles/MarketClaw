import { eq, desc, or, ilike } from "drizzle-orm";
import { db, agentsTable } from "@workspace/db";
import {
  CreateAgentBody,
  GetAgentResponse,
  ListAgentsResponse,
  SearchAgentsResponse,
} from "@workspace/api-zod";
import type { z } from "zod";

export async function listAgents(): Promise<z.infer<typeof ListAgentsResponse>> {
  const agents = await db
    .select()
    .from(agentsTable)
    .orderBy(desc(agentsTable.createdAt));
  return ListAgentsResponse.parse(agents);
}

export async function getAgentById(id: number): Promise<z.infer<typeof GetAgentResponse> | null> {
  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, id));
  return agent ? GetAgentResponse.parse(agent) : null;
}

export async function createAgent(
  data: z.infer<typeof CreateAgentBody>
): Promise<z.infer<typeof GetAgentResponse>> {
  const [agent] = await db.insert(agentsTable).values(data).returning();
  return GetAgentResponse.parse(agent);
}

export async function searchAgents(q: string): Promise<z.infer<typeof SearchAgentsResponse>> {
  const pattern = `%${q}%`;
  const agents = await db
    .select()
    .from(agentsTable)
    .where(
      or(
        ilike(agentsTable.tags, pattern),
        ilike(agentsTable.description, pattern),
        ilike(agentsTable.agentName, pattern),
        ilike(agentsTable.serviceTitle, pattern)
      )
    )
    .orderBy(desc(agentsTable.createdAt));
  return SearchAgentsResponse.parse(agents);
}
