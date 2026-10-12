import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errorHandler";
import * as posService from "./pos.service";

function u(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
  return req.user;
}

function branch(req: Request) {
  if (!req.branchId) throw new AppError(400, "BRANCH_REQUIRED", "Select a branch");
  return req.branchId;
}

export async function checkout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    const sale = await posService.checkout(
      user.businessId,
      branch(req),
      user.id,
      req.body,
    );
    res.status(201).json(sale);
  } catch (e) {
    next(e);
  }
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    res.json(
      await posService.listSales(user.businessId, branch(req), page, limit),
    );
  } catch (e) {
    next(e);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    const id = req.params.id;
    if (typeof id !== "string" || !id) {
      throw new AppError(400, "INVALID_ID", "Missing ID");
    }
    res.json(await posService.getSale(user.businessId, branch(req), id));
  } catch (e) {
    next(e);
  }
}
