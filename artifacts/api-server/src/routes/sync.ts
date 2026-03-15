import { Router, type IRouter } from "express";
import { syncFromAgentAi } from "../integrations/agent-ai";
import { SYNC_DEFAULTS } from "../config";

const router: IRouter = Router();

router.post("/sync/agent-ai", async (req, res) => {
  try {
    const pages    = Math.min(Number(req.body?.pages    ?? SYNC_DEFAULTS.pages),    SYNC_DEFAULTS.maxPages);
    const pageSize = Math.min(Number(req.body?.pageSize ?? SYNC_DEFAULTS.pageSize), SYNC_DEFAULTS.maxPageSize);
    const query    = String(req.body?.query ?? SYNC_DEFAULTS.query);

    const result = await syncFromAgentAi({ pages, pageSize, query });
    res.json({ success: true, ...result, total: result.inserted + result.skipped });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
