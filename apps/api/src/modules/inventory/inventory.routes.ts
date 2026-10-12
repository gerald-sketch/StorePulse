import { Router } from "express";
import { AdjustStockSchema, StockInSchema, StockOutSchema } from "@sb/shared";
import { validate } from "../../middleware/validate";
import { requireAuth, requireBranch, requireRole } from "../../middleware/auth";
import { idempotent } from "../../middleware/idempotency";
import * as inventoryController from "./inventory.controller";

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);
inventoryRouter.use(requireBranch);

inventoryRouter.get("/low-stock", inventoryController.lowStock);

inventoryRouter.post(
  "/adjust",
  requireRole(["OWNER", "MANAGER"]),
  idempotent("inventory.adjust"),
  validate({ body: AdjustStockSchema }),
  inventoryController.adjust,
);

inventoryRouter.post(
  "/stock-in",
  requireRole(["OWNER", "MANAGER"]),
  idempotent("inventory.stock-in"),
  validate({ body: StockInSchema }),
  inventoryController.stockIn,
);

inventoryRouter.post(
  "/stock-out",
  requireRole(["OWNER", "MANAGER"]),
  idempotent("inventory.stock-out"),
  validate({ body: StockOutSchema }),
  inventoryController.stockOut,
);
