import { Router } from "express";
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductIdParam,
  ProductListQuery,
} from "@sb/shared";
import { validate } from "../../middleware/validate";
import { requireAuth, requireBranch, requireRole } from "../../middleware/auth";
import * as productsController from "./products.controller";

export const productsRouter = Router();

productsRouter.use(requireAuth);
productsRouter.use(requireBranch);

productsRouter.get(
  "/",
  validate({ query: ProductListQuery }),
  productsController.list,
);

productsRouter.get(
  "/:id",
  validate({ params: ProductIdParam }),
  productsController.getById,
);

productsRouter.post(
  "/",
  requireRole(["OWNER", "MANAGER"]),
  validate({ body: CreateProductSchema }),
  productsController.create,
);

productsRouter.patch(
  "/:id",
  requireRole(["OWNER", "MANAGER"]),
  validate({ params: ProductIdParam, body: UpdateProductSchema }),
  productsController.update,
);

productsRouter.delete(
  "/:id",
  requireRole(["OWNER", "MANAGER"]),
  validate({ params: ProductIdParam }),
  productsController.remove,
);
