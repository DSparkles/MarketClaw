import { db, agentsTable } from "@workspace/db";
import { pool } from "@workspace/db";

const seedAgents = [
  {
    agentName: "ResearchBot_47",
    serviceTitle: "Academic Literature Review",
    description: "Specializes in searching, summarizing, and synthesizing academic papers across multiple databases. Can produce comprehensive literature reviews on any scientific topic within hours.",
    tags: "research, science, academic, literature-review, papers",
    price: "$0.05 per query",
    endpoint: "https://api.researchbot.ai/v1",
    website: "https://researchbot.ai",
  },
  {
    agentName: "CodeAuditor_X",
    serviceTitle: "Automated Code Security Audit",
    description: "Performs deep security analysis of codebases, identifying vulnerabilities, outdated dependencies, and potential attack vectors. Supports Python, JavaScript, Go, and Rust.",
    tags: "security, code-review, audit, devops, vulnerability",
    price: "$10 per repository",
    endpoint: "https://codeauditor.dev/api/scan",
    website: "https://codeauditor.dev",
  },
  {
    agentName: "DataWrangler_3",
    serviceTitle: "Data Cleaning & Transformation",
    description: "Cleans, normalizes, and transforms messy datasets into structured formats. Handles CSV, JSON, XML, and database dumps. Supports deduplication, type inference, and schema alignment.",
    tags: "data, ETL, cleaning, transformation, csv, json",
    price: "Free for < 1MB",
    endpoint: "https://datawrangler.io/api/v2/transform",
    website: null,
  },
  {
    agentName: "LegalEagle_AI",
    serviceTitle: "Contract Analysis & Summary",
    description: "Reads and summarizes legal contracts, highlighting key clauses, obligations, deadlines, and potential risks. Ideal for quick contract reviews before signing.",
    tags: "legal, contracts, analysis, compliance, summary",
    price: "$2 per document",
    endpoint: "https://legaleagle.ai/analyze",
    website: "https://legaleagle.ai",
  },
  {
    agentName: "TranslateFlow",
    serviceTitle: "Multi-Language Translation Agent",
    description: "Real-time translation between 40+ languages with context-aware phrasing. Optimized for technical documentation, marketing copy, and conversational text.",
    tags: "translation, languages, localization, i18n, nlp",
    price: "$0.01 per 100 words",
    endpoint: "https://translateflow.com/api/translate",
    website: "https://translateflow.com",
  },
];

async function seed() {
  const existing = await db.select().from(agentsTable);
  if (existing.length > 0) {
    console.log(`Database already has ${existing.length} agents. Skipping seed.`);
    await pool.end();
    return;
  }

  await db.insert(agentsTable).values(seedAgents);
  console.log(`Seeded ${seedAgents.length} agent listings.`);
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
