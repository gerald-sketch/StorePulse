import { Router } from "express";
import { ReportRangeQuery, TopProductsQuery, ExportQuery } from "@sb/shared";
import { validate } from "../../middleware/validate";
import { requireAuth, requireBranch, requireRole } from "../../middleware/auth";
import * as c from "./reports.controller";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.use(requireRole(["OWNER", "MANAGER"]));
reportsRouter.use(requireBranch);

reportsRouter.get(
  "/sales-summary",
  validate({ query: ReportRangeQuery }),
  c.salesSummary,
);

reportsRouter.get(
  "/profit-loss",
  validate({ query: ReportRangeQuery }),
  c.profitLoss,
);

reportsRouter.get("/inventory-valuation", c.inventoryValuation);

reportsRouter.get(
  "/top-products",
  validate({ query: TopProductsQuery }),
  c.topProducts,
);

reportsRouter.get(
  "/export/sales.csv",
  validate({ query: ExportQuery }),
  c.exportSales,
);
