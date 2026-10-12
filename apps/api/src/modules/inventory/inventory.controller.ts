import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errorHandler";
import * as inventoryService from "./inventory.service";

function requireUser(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
  return req.user;
}

function requireBranch(req: Request) {
  if (!req.branchId) {
    throw new AppError(400, "BRANCH_REQUIRED", "Select a branch");
  }
  return req.branchId;
}

export async function adjust(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const result = await inventoryService.adjust(
      user.businessId,
      requireBranch(req),
      req.body,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function stockIn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const result = await inventoryService.stockIn(
      user.businessId,
      requireBranch(req),
      req.body,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function stockOut(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const result = await inventoryService.stockOut(
      user.businessId,
      requireBranch(req),
      req.body,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function lowStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const threshold = req.query.threshold ? Number(req.query.threshold) : 5;
    const items = await inventoryService.lowStock(
      user.businessId,
      requireBranch(req),
      threshold,
    );
    res.json({ items, threshold });
  } catch (e) {
    next(e);
  }
}
