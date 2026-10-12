import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errorHandler";
import * as service from "./expenses.service";

function u(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
  return req.user;
}

function branch(req: Request) {
  if (!req.branchId) throw new AppError(400, "BRANCH_REQUIRED", "Select a branch");
  return req.branchId;
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
    const category =
      typeof req.query.category === "string" ? req.query.category : undefined;
    res.json(await service.list(user.businessId, branch(req), page, limit, category));
  } catch (e) {
    next(e);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    res
      .status(201)
      .json(await service.create(user.businessId, branch(req), user.id, req.body));
  } catch (e) {
    next(e);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || !id) {
      throw new AppError(400, "INVALID_ID", "Missing ID");
    }
    res.json(await service.update(u(req).businessId, branch(req), id, req.body));
  } catch (e) {
    next(e);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || !id) {
      throw new AppError(400, "INVALID_ID", "Missing ID");
    }
    await service.softDelete(u(req).businessId, branch(req), id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function summary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    const now = new Date();
    const year = Number(req.query.year) || now.getUTCFullYear();
    const month = Number(req.query.month) || now.getUTCMonth() + 1;
    if (month < 1 || month > 12) {
      throw new AppError(400, "INVALID_MONTH", "Month must be 1-12");
    }
    res.json(
      await service.monthlySummary(user.businessId, branch(req), year, month),
    );
  } catch (e) {
    next(e);
  }
}
