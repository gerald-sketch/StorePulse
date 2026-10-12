import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errorHandler";
import * as service from "./purchases.service";

type PurchaseStatus = "PENDING" | "RECEIVED" | "CANCELLED";

function u(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
  return req.user;
}

function branch(req: Request) {
  if (!req.branchId) throw new AppError(400, "BRANCH_REQUIRED", "Select a branch");
  return req.branchId;
}

function parseStatus(value: unknown): PurchaseStatus | undefined {
  if (value === "PENDING" || value === "RECEIVED" || value === "CANCELLED") {
    return value;
  }
  return undefined;
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
    const status = parseStatus(req.query.status);
    res.json(await service.list(user.businessId, branch(req), page, limit, status));
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
    const id = req.params.id;
    if (typeof id !== "string" || !id) {
      throw new AppError(400, "INVALID_ID", "Missing ID");
    }
    res.json(await service.getById(u(req).businessId, branch(req), id));
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
      .json(
        await service.create(
          user.businessId,
          branch(req),
          user.id,
          req.body,
        ),
      );
  } catch (e) {
    next(e);
  }
}

export async function receive(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || !id) {
      throw new AppError(400, "INVALID_ID", "Missing ID");
    }
    res.json(await service.receive(u(req).businessId, branch(req), id));
  } catch (e) {
    next(e);
  }
}

export async function cancel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || !id) {
      throw new AppError(400, "INVALID_ID", "Missing ID");
    }
    res.json(await service.cancel(u(req).businessId, branch(req), id));
  } catch (e) {
    next(e);
  }
}
