import { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errorHandler";
import * as service from "./branches.service";

function currentUser(req: Request) {
  if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
  return req.user;
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = currentUser(req);
    res.json({
      items: await service.list(user.businessId, user.id, user.role),
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
    const user = currentUser(req);
    res
      .status(201)
      .json(
        await service.create(
          user.businessId,
          req.body.name,
          req.body.address,
        ),
      );
  } catch (error) {
    next(error);
  }
}
