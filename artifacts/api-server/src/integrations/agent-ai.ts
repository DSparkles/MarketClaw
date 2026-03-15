import { db, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AGENT_AI_API_BASE } from "../config";

interface AgentAiMetadata {
  id: string;
  slug: string | null;
  icon: string;
  name: string;
  description: string;
  status: string;
  type: string;
  executions: number;
  reviews_count: number;
  reviews_score: number;
  created_at: string;
  updated_at: string;
  score?: number;
}

interface AgentAiEntry {
  type: string;
  function: {
    name: string;
    description: string;
    metadata: AgentAiMetadata;
    parameters?: {
      type: string;
      properties?: Record<string, { type: string; description?: string }>;
    };
  };
}

interface SearchResponse {
  response: AgentAiEntry[];
}

const ICON_TAGS: Record<string, string[]> = {
  "sales-pipeline":   ["sales", "CRM", "prospecting"],
  "action":           ["automation", "workflow", "productivity"],
  "wisdom":           ["research", "analysis", "intelligence"],
  "earnings":         ["branding", "startups", "naming"],
  "youtube2":         ["video", "content", "scriptwriting"],
  "web-address":      ["domains", "branding", "valuation"],
  "meme":             ["social-media", "content", "humor"],
  "copywriting":      ["copywriting", "writing", "content"],
  "linkedin2":        ["LinkedIn", "social-media", "research"],
  "brand":            ["branding", "marketing", "strategy"],
  "email":            ["email", "outreach", "marketing"],
  "summarize":        ["summarization", "productivity", "research"],
  "seo":              ["SEO", "content", "marketing"],
  "data":             ["data", "analytics", "insights"],
  "code":             ["coding", "development", "engineering"],
  "image":            ["image", "creative", "design"],
  "customer-service": ["customer-service", "support", "CRM"],
};

function iconToTags(iconPath: string | null | undefined): string[] {
  if (!iconPath) return ["AI", "agent"];
  const match = Object.entries(ICON_TAGS).find(([key]) => iconPath.includes(key));
  return match ? match[1] : ["AI", "agent"];
}

function descriptionToServiceTitle(name: string, description: string): string {
  const firstSentence = description.split(/\.\s+/)[0]?.trim();
  if (firstSentence && firstSentence.length <= 80) return firstSentence;
  return name;
}

function makeDescription(meta: AgentAiMetadata): string {
  const rating = meta.reviews_score > 0
    ? `Rated ${meta.reviews_score.toFixed(1)}/5 with ${meta.reviews_count.toLocaleString()} reviews`
    : null;
  const runs = meta.executions > 0
    ? `${meta.executions.toLocaleString()}+ runs on agent.ai`
    : null;
  const suffix = [rating, runs].filter(Boolean).join(" · ");
  return suffix ? `${meta.description}\n\n${suffix}.` : meta.description;
}

export interface SyncOptions {
  pages?: number;
  pageSize?: number;
  query?: string;
}

export interface SyncResult {
  inserted: number;
  skipped: number;
  errors: number;
}

export async function syncFromAgentAi(opts: SyncOptions = {}): Promise<SyncResult> {
  const token = process.env["AGENT_AI_API_KEY"];
  if (!token) throw new Error("AGENT_AI_API_KEY is not set");

  const { pages = 5, pageSize = 20, query = "" } = opts;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let page = 0; page < pages; page++) {
    let entries: AgentAiEntry[];
    try {
      const res = await fetch(`${AGENT_AI_API_BASE}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, status: "public", limit: pageSize, page }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.error(`agent.ai search page ${page} failed: ${res.status}`);
        errors++;
        break;
      }
      const data = (await res.json()) as SearchResponse;
      entries = data.response ?? [];
    } catch (err) {
      console.error(`agent.ai search page ${page} error:`, err);
      errors++;
      break;
    }

    if (entries.length === 0) break;

    for (const entry of entries) {
      const meta = entry.function.metadata;
      const externalId = `agent.ai:${meta.id}`;

      try {
        const existing = await db
          .select({ id: agentsTable.id })
          .from(agentsTable)
          .where(eq(agentsTable.externalId, externalId));

        if (existing.length > 0) { skipped++; continue; }

        const tags = [
          ...iconToTags(meta.icon),
          meta.type === "studio" ? "no-code" : "",
        ]
          .filter(Boolean)
          .slice(0, 6)
          .join(", ");

        await db.insert(agentsTable).values({
          agentName: meta.name,
          serviceTitle: descriptionToServiceTitle(meta.name, meta.description),
          description: makeDescription(meta),
          tags,
          price: "Free (agent.ai account required)",
          endpoint: `https://agent.ai/agent/${meta.slug ?? meta.id}`,
          website: `https://agent.ai/agent/${meta.slug ?? meta.id}`,
          externalId,
          externalSource: "agent.ai",
        });
        inserted++;
      } catch (err) {
        console.error(`Failed to insert agent ${meta.id}:`, err);
        errors++;
      }
    }

    if (entries.length < pageSize) break;
  }

  return { inserted, skipped, errors };
}
