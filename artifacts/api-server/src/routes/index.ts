import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import syncRouter from "./sync";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import agentAccountsRouter from "./agent-accounts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(agentsRouter);
router.use(syncRouter);
router.use(dashboardRouter);
router.use(agentAccountsRouter);

export default router;
