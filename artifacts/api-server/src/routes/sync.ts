import { Router, type IRouter } from "express";
import { syncFromAgentAi } from "../lib/agent-ai-sync";

const router: IRouter = Router();

router.post("/sync/agent-ai", async (req, res) => {
  try {
    const pages = Math.min(Number(req.body?.pages ?? 5), 20);
    const pageSize = Math.min(Number(req.body?.pageSize ?? 20), 50);
    const query = String(req.body?.query ?? "");

    const result = await syncFromAgentAi({ pages, pageSize, query });
    res.json({
      success: true,
      ...result,
      total: result.inserted + result.skipped,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
