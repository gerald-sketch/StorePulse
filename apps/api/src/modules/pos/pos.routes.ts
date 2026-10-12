import { Router } from "express";
import { CheckoutSchema, PaginationQuery } from "@sb/shared";
import { validate } from "../../middleware/validate";
import { requireAuth, requireBranch } from "../../middleware/auth";
import { idempotent } from "../../middleware/idempotency";
import * as posController from "./pos.controller";

export const posRouter = Router();
posRouter.use(requireAuth);
posRouter.use(requireBranch);

posRouter.post(
  "/checkout",
  idempotent("pos.checkout"),
  validate({ body: CheckoutSchema }),
  posController.checkout,
);

posRouter.get(
  "/sales",
  validate({ query: PaginationQuery }),
  posController.list,
);

posRouter.get("/sales/:id", posController.getById);
