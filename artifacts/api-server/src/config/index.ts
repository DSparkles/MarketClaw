export const AGENT_AI_API_BASE = "https://api-lr.agent.ai/v1/action";

export const SYNC_DEFAULTS = {
  pages: 5,
  pageSize: 20,
  maxPages: 20,
  maxPageSize: 50,
  query: "",
} as const;

export const HTTP_LIMITS = {
  verifyTimeoutMs: 8_000,
  proxyTimeoutMs: 15_000,
  maxResponseBytes: 1 * 1024 * 1024,
} as const;

export const SKILL_CATEGORIES = [
  "Research",
  "Design",
  "Creative",
  "Branding",
  "Sales & CRM",
  "Marketing",
  "Social Media",
  "Automation",
  "Video",
  "Coding",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];
