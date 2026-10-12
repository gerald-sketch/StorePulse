import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errorHandler";
import * as service from "./dashboard.service";

function branch(req: Request) {
  if (!req.branchId) throw new AppError(400, "BRANCH_REQUIRED", "Select a branch");
  return req.branchId;
}

export async function summary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    res.json(await service.summary(req.user.businessId, branch(req)));
  } catch (e) {
    next(e);
  }
}

export async function mySalesHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    const date = typeof req.query.date === "string" ? req.query.date : "";
    if (!date) throw new AppError(400, "INVALID_DATE", "A date is required");
    res.json(
      await service.mySalesHistory(
        req.user.businessId,
        branch(req),
        req.user.id,
        date,
      ),
    );
  } catch (e) {
    next(e);
  }
}

export async function staffOverview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    const [staff, todayRevenue] = await Promise.all([
      service.staffOverview(req.user.businessId, branch(req)),
      service.todaySalesTotal(req.user.businessId, branch(req)),
    ]);
    res.json({ staff, todayRevenue });
  } catch (e) {
    next(e);
  }
}

export async function staffDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    const userId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    if (!userId) throw new AppError(400, "INVALID_ID", "Missing user ID");
    const detail = await service.staffDetail(
      req.user.businessId,
      branch(req),
      userId,
    );
    res.json(detail);
  } catch (e) {
    next(e);
  }
}

export async function staffProductSales(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    const userId = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;
    const from = typeof req.query.from === "string" ? req.query.from : "";
    const to = typeof req.query.to === "string" ? req.query.to : "";
    if (!userId || !from || !to) {
      throw new AppError(400, "INVALID_RANGE", "A staff ID and date range are required");
    }
    res.json(
      await service.staffProductSales(
        req.user.businessId,
        branch(req),
        userId,
        from,
        to,
      ),
    );
  } catch (e) {
    next(e);
  }
}
