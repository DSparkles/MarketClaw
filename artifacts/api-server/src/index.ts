import app from "./app";
import { db, agentsTable } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";
import { syncFromAgentAi } from "./lib/agent-ai-sync";

async function seedOnFirstRun() {
  try {
    const fromAgentAi = await db
      .select({ id: agentsTable.id })
      .from(agentsTable)
      .where(isNotNull(agentsTable.externalSource));

    if (fromAgentAi.length === 0) {
      console.log("No agent.ai listings found — starting initial sync...");
      const result = await syncFromAgentAi({ pages: 5, pageSize: 20 });
      console.log(
        `agent.ai sync complete: ${result.inserted} inserted, ${result.skipped} skipped, ${result.errors} errors.`
      );
    } else {
      console.log(`Found ${fromAgentAi.length} agent.ai agents already in DB.`);
    }
  } catch (err) {
    console.error("Startup sync failed (non-fatal):", err);
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided."
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
