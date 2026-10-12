import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireBranch, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as c from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/summary",
  requireRole(["OWNER", "MANAGER"]),
  requireBranch,
  c.summary,
);

const SalesHistoryQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

dashboardRouter.get(
  "/my-sales",
  validate({ query: SalesHistoryQuery }),
  requireBranch,
  c.mySalesHistory,
);

const UserIdParam = z.object({ userId: z.string().uuid() });
const ProductSalesQuery = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine(({ from, to }) => from <= to, {
    message: "from must be before or equal to to",
    path: ["to"],
  });

dashboardRouter.get(
  "/staff",
  requireRole(["OWNER", "MANAGER"]),
  requireBranch,
  c.staffOverview,
);

dashboardRouter.get(
  "/staff/:userId",
  requireRole(["OWNER", "MANAGER"]),
  validate({ params: UserIdParam }),
  requireBranch,
  c.staffDetail,
);

dashboardRouter.get(
  "/staff/:userId/product-sales",
  requireRole(["OWNER", "MANAGER"]),
  validate({ params: UserIdParam, query: ProductSalesQuery }),
  requireBranch,
  c.staffProductSales,
);
