import { Router } from "express";
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  ResetEmployeePasswordSchema,
  ProductIdParam,
} from "@sb/shared";
import { validate } from "../../middleware/validate";
import { requireAuth, requireBranch, requireRole } from "../../middleware/auth";
import * as c from "./employees.controller";

export const employeesRouter = Router();
employeesRouter.use(requireAuth);
employeesRouter.use(requireRole(["OWNER", "MANAGER"]));

employeesRouter.get("/", requireBranch, c.list);

employeesRouter.post(
  "/",
  requireRole(["OWNER"]),
  validate({ body: CreateEmployeeSchema }),
  c.create,
);

employeesRouter.patch(
  "/:id",
  requireRole(["OWNER"]),
  validate({ params: ProductIdParam, body: UpdateEmployeeSchema }),
  c.update,
);

employeesRouter.patch(
  "/:id/password",
  requireRole(["OWNER"]),
  validate({ params: ProductIdParam, body: ResetEmployeePasswordSchema }),
  c.resetPassword,
);

employeesRouter.delete(
  "/:id",
  requireRole(["OWNER"]),
  validate({ params: ProductIdParam }),
  c.remove,
);
