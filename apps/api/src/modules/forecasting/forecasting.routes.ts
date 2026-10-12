import { Router } from "express";
import { requireAuth, requireBranch, requireRole } from "../../middleware/auth";
import * as c from "./forecasting.controller";

export const forecastingRouter = Router();

forecastingRouter.use(requireAuth);
forecastingRouter.use(requireRole(["OWNER", "MANAGER"]));
forecastingRouter.use(requireBranch);

forecastingRouter.get("/insights", c.getInsights);
