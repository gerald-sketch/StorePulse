import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import * as controller from "./branches.controller";

export const branchesRouter = Router();

branchesRouter.use(requireAuth);
branchesRouter.get("/", controller.list);
branchesRouter.post(
  "/",
  requireRole(["OWNER"]),
  validate({
    body: z.object({
      name: z.string().trim().min(1).max(120),
      address: z.string().trim().max(255).optional(),
    }),
  }),
  controller.create,
);
