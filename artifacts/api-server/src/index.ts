import app from "./app";
import { db, agentsTable } from "@workspace/db";

const seedAgents = [
  {
    agentName: "Buyer Persona Builder",
    serviceTitle: "ICP & Buyer Persona Analysis",
    description: "Most sales teams struggle to use persona frameworks because they focus on surface-level characteristics rather than understanding the deeper patterns that make someone a perfect fit. This agent analyzes successful customers to reveal exactly who buys your product. With these insights, you'll get actionable recommendations for where to find more high-value prospects, how to spot their buying signals, and how to engage them effectively. Rated 4.4/5 with 17,300+ runs on agent.ai.",
    tags: "sales, marketing, personas, ICP, prospecting",
    price: "Free (agent.ai account required)",
    endpoint: "https://agent.ai/agent/0kzxd5sd7jd5yhyy",
    website: "https://agent.ai/agent/0kzxd5sd7jd5yhyy",
  },
  {
    agentName: "Video Script Generator",
    serviceTitle: "AI Video Script Writing",
    description: "Creates engaging scripts for various types of video content, such as explainer videos, product demos, and promotional videos. Assists content creators, marketers, and educators by automating the scriptwriting process, saving time and ensuring consistently high-quality output. One of agent.ai's most popular agents with 115,000+ runs. Rated 4.2/5.",
    tags: "video, content, marketing, copywriting, scriptwriting",
    price: "Free (agent.ai account required)",
    endpoint: "https://agent.ai/agent/lt8gzzc4s59qym06",
    website: "https://agent.ai/agent/lt8gzzc4s59qym06",
  },
  {
    agentName: "Domain Idea Generator",
    serviceTitle: "Domain Name Discovery & Availability",
    description: "Generate domain ideas and provide data on which ones are available for purchase, and what price they are available. Supports natural language so you can be specific about what you're looking for. Built by Dharmesh Shah (HubSpot co-founder). Rated 4.3/5 with 8,500+ runs.",
    tags: "domains, naming, branding, startups, availability",
    price: "Free (agent.ai account required)",
    endpoint: "https://agent.ai/agent/o3tuirucvw3c651k",
    website: "https://agent.ai/agent/o3tuirucvw3c651k",
  },
  {
    agentName: "Website Domain Valuation Expert",
    serviceTitle: "Domain Name Appraisal & Pricing",
    description: "Appraises the value of a domain name by analyzing data from millions of actual domain transactions, providing accurate and up-to-date valuations based on recent market trends and sales history. Built by Dharmesh Shah (HubSpot co-founder). Rated 4.37/5 with 991 runs on agent.ai.",
    tags: "domains, valuation, investment, branding, appraisal",
    price: "Free (agent.ai account required)",
    endpoint: "https://agent.ai/agent/xaymmw4g7obsfitc",
    website: "https://agent.ai/agent/xaymmw4g7obsfitc",
  },
  {
    agentName: "HubSpot Marketplace Listing Grader",
    serviceTitle: "HubSpot App Marketplace Optimization",
    description: "Evaluates your HubSpot App Marketplace listing and provides guidance and tips to improve install growth and engagement. Leverages benchmark data from AppMarketplace.com to assess how your listing stacks up against others. Built by Hugh Durkin. Rated 4.40/5 with 1,200+ runs.",
    tags: "HubSpot, marketplace, SaaS, growth, optimization",
    price: "Free (agent.ai account required)",
    endpoint: "https://agent.ai/agent/5lmdg0q0fbms39sd",
    website: "https://agent.ai/agent/5lmdg0q0fbms39sd",
  },
  {
    agentName: "Executive DISC Profile",
    serviceTitle: "Executive Personality & Communication Profile",
    description: "Given the name of an executive and the company they work for, this agent finds their LinkedIn profile and posts, then generates a DISC profile and gives you actionable tips on how to communicate with them. Covers Dominance (D), Influence (I), Steadiness (S), and Conscientiousness (C). Built by Vikram Ekambaram. Rated 4.19/5.",
    tags: "sales, CRM, personality, communication, LinkedIn, executives",
    price: "Free (agent.ai account required)",
    endpoint: "https://agent.ai/agent/9m53pgv1pbjpal33",
    website: "https://agent.ai/agent/9m53pgv1pbjpal33",
  },
  {
    agentName: "Company Research Agent",
    serviceTitle: "Deep Company Research & Intelligence",
    description: "Get complete, credible, custom company research notes tailored to your needs. Ideal for sales prep, competitive analysis, investor research, and partnership evaluation. Official agent from the Agent.ai team. Premium tier. Rated 4.67/5.",
    tags: "research, sales, competitive-intelligence, B2B, due-diligence",
    price: "Pro plan (agent.ai)",
    endpoint: "https://agent.ai/agent/cgjb7t4smw3i02r0",
    website: "https://agent.ai/agent/cgjb7t4smw3i02r0",
  },
  {
    agentName: "Meme Maker",
    serviceTitle: "AI Meme Generation",
    description: "Automatically generates funny, on-trend memes by picking the right templates and crafting clever captions, making it easy to churn out viral content fast. All you need to do is provide the prompt. Built by Dharmesh Shah (HubSpot co-founder). Rated 3.88/5 with 3,400+ runs.",
    tags: "memes, social-media, content, humor, viral",
    price: "Free (agent.ai account required)",
    endpoint: "https://agent.ai/agent/9kuy7lwvuud9yyzl",
    website: "https://agent.ai/agent/9kuy7lwvuud9yyzl",
  },
  {
    agentName: "Recent LinkedIn Posts Summarizer",
    serviceTitle: "LinkedIn Activity Research & Summary",
    description: "Summarizes the latest posts from a number of LinkedIn users. Just enter the profile URLs for the people you want to research. Great for sales call prep, competitive monitoring, and relationship building. Built by Andrei Oprisan. Rated 4.37/5 with 876 runs.",
    tags: "LinkedIn, social-media, research, sales, monitoring",
    price: "Free (agent.ai account required)",
    endpoint: "https://agent.ai/agent/we5qh62kxzsq9jl7",
    website: "https://agent.ai/agent/we5qh62kxzsq9jl7",
  },
  {
    agentName: "Loading Message Generator",
    serviceTitle: "Witty Loading & Wait Message Copy",
    description: "Creates fun and relevant loading messages to entertain users while your agent runs. Perfect for UX copywriters, product teams, and developers building AI-powered apps. Built by Beth Dunn. Rated 4.33/5 with 323 runs on agent.ai.",
    tags: "UX, copywriting, loading, product, humor",
    price: "Free (agent.ai account required)",
    endpoint: "https://agent.ai/agent/nhwrqdx5nvqt899a",
    website: "https://agent.ai/agent/nhwrqdx5nvqt899a",
  },
];

async function seedOnFirstRun() {
  try {
    const existing = await db.select().from(agentsTable);
    if (existing.length === 0) {
      await db.insert(agentsTable).values(seedAgents);
      console.log(`Seeded ${seedAgents.length} example agent listings.`);
    }
  } catch (err) {
    console.error("Auto-seed check failed (non-fatal):", err);
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedOnFirstRun().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
