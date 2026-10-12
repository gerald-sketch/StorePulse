import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errorHandler";
import * as service from "./reports.service";

function u(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
  return req.user;
}

function branch(req: Request) {
  if (!req.branchId) throw new AppError(400, "BRANCH_REQUIRED", "Select a branch");
  return req.branchId;
}

function parseDates(req: Request) {
  const from =
    typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
  const to =
    typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
  return service.resolveRange(from, to);
}

export async function salesSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    const { from, to } = parseDates(req);
    const groupBy = (req.query.groupBy as "day" | "week" | "month") ?? "day";
    res.json(
      await service.salesSummary(
        user.businessId,
        branch(req),
        from,
        to,
        groupBy,
      ),
    );
  } catch (e) {
    next(e);
  }
}

export async function profitLoss(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    const { from, to } = parseDates(req);
    res.json(await service.profitLoss(user.businessId, branch(req), from, to));
  } catch (e) {
    next(e);
  }
}

export async function inventoryValuation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    res.json(await service.inventoryValuation(user.businessId, branch(req)));
  } catch (e) {
    next(e);
  }
}

export async function topProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    const { from, to } = parseDates(req);
    const limit = Number(req.query.limit) || 10;
    res.json(
      await service.topProducts(
        user.businessId,
        branch(req),
        from,
        to,
        limit,
      ),
    );
  } catch (e) {
    next(e);
  }
}

export async function exportSales(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = u(req);
    const { from, to } = parseDates(req);
    const csv = await service.exportSalesCsv(
      user.businessId,
      branch(req),
      from,
      to,
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  } catch (e) {
    next(e);
  }
}
