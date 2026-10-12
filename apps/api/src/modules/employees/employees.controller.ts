import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errorHandler";
import * as service from "./employees.service";

function requireUser(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
  return req.user;
}

function requireId(req: Request): string {
  const id = req.params.id;
  if (!id || Array.isArray(id)) {
    throw new AppError(400, "INVALID_ID", "Missing employee ID");
  }
  return id;
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    res.json({
      items: await service.list(
        user.businessId,
        user.role === "OWNER" ? undefined : req.branchId,
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    res.status(201).json(await service.create(user.businessId, req.body));
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    res.json(await service.update(user.businessId, requireId(req), req.body));
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    await service.resetPassword(
      user.businessId,
      requireId(req),
      req.body.password,
      user.id,
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    await service.hardDelete(user.businessId, requireId(req), user.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
