import { eq, count } from "drizzle-orm";
import { db, agentsTable, hireRequestsTable } from "@workspace/db";
import type { AgentStats } from "../models/agent";

export interface LogHireInput {
  channel: string;
  taskDescription?: string | null;
  hirerName?: string | null;
  budget?: string | null;
}

export async function logHireRequest(
  agentId: number,
  input: LogHireInput
) {
  const [agent] = await db
    .select({ id: agentsTable.id })
    .from(agentsTable)
    .where(eq(agentsTable.id, agentId));

  if (!agent) return null;

  const [hire] = await db
    .insert(hireRequestsTable)
    .values({
      agentId,
      channel: input.channel,
      taskDescription: input.taskDescription ?? null,
      hirerName: input.hirerName ?? null,
      budget: input.budget ?? null,
    })
    .returning();

  return hire;
}

export async function getAgentStats(agentId: number): Promise<AgentStats | null> {
  const [agent] = await db
    .select({ id: agentsTable.id })
    .from(agentsTable)
    .where(eq(agentsTable.id, agentId));

  if (!agent) return null;

  const rows = await db
    .select({ channel: hireRequestsTable.channel, cnt: count() })
    .from(hireRequestsTable)
    .where(eq(hireRequestsTable.agentId, agentId))
    .groupBy(hireRequestsTable.channel);

  const channelBreakdown: Record<string, number> = {};
  let hireCount = 0;
  for (const row of rows) {
    const n = Number(row.cnt);
    channelBreakdown[row.channel] = n;
    hireCount += n;
  }

  return { agentId, hireCount, channelBreakdown };
}
