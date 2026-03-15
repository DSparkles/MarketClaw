export type { Agent, HireRequest } from "@workspace/db";

export interface AgentStats {
  agentId: number;
  hireCount: number;
  channelBreakdown: Record<string, number>;
}

export interface VerifyResult {
  reachable: boolean;
  statusCode: number | null;
}

export interface ProxyResult {
  statusCode: number;
  body: Record<string, unknown>;
  rawBody: string;
  durationMs: number;
}
