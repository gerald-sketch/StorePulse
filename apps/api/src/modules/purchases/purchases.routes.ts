import { Router } from "express";
import { CreatePurchaseSchema, ProductIdParam } from "@sb/shared";
import { validate } from "../../middleware/validate";
import { requireAuth, requireBranch, requireRole } from "../../middleware/auth";
import { idempotent } from "../../middleware/idempotency";
import * as c from "./purchases.controller";

export const purchasesRouter = Router();
purchasesRouter.use(requireAuth);
purchasesRouter.use(requireBranch);

purchasesRouter.get("/", c.list);
purchasesRouter.get("/:id", validate({ params: ProductIdParam }), c.getById);

purchasesRouter.post(
  "/",
  requireRole(["OWNER", "MANAGER"]),
  idempotent("purchases.create"),
  validate({ body: CreatePurchaseSchema }),
  c.create,
);

purchasesRouter.post(
  "/:id/receive",
  requireRole(["OWNER", "MANAGER"]),
  idempotent("purchases.receive"),
  validate({ params: ProductIdParam }),
  c.receive,
);

purchasesRouter.post(
  "/:id/cancel",
  requireRole(["OWNER", "MANAGER"]),
  validate({ params: ProductIdParam }),
  c.cancel,
);
