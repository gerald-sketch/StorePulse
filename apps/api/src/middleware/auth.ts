import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, Role } from "../lib/jwt";
import { AppError } from "./errorHandler";
import { prisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        businessId: string;
        role: Role;
        branchId?: string;
      };
    }
    interface Request {
      branchId?: string;
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Missing access token"));
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      businessId: payload.businessId,
      role: payload.role,
    };
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(allowed: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Not authenticated"));
    }

    try {
      const user = await prisma.user.findFirst({
        where: {
          id: req.user.id,
          businessId: req.user.businessId,
          deletedAt: null,
        },
        select: { role: true, branchId: true },
      });

      if (!user) {
        return next(new AppError(401, "UNAUTHORIZED", "User no longer exists"));
      }

      req.user.role = user.role as Role;
      req.user.branchId = user.branchId;

      if (!allowed.includes(user.role as Role)) {
        return next(new AppError(403, "FORBIDDEN", "Insufficient permissions"));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function requireBranch(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Not authenticated");
    }

    const user = await prisma.user.findFirst({
      where: {
        id: req.user.id,
        businessId: req.user.businessId,
        deletedAt: null,
      },
      select: { role: true, branchId: true },
    });
    if (!user) throw new AppError(401, "UNAUTHORIZED", "User no longer exists");

    const requestedBranchId = req.header("x-branch-id");
    const branchId =
      user.role === "OWNER" && requestedBranchId
        ? requestedBranchId
        : user.branchId;

    if (user.role !== "OWNER" && requestedBranchId && requestedBranchId !== user.branchId) {
      throw new AppError(403, "FORBIDDEN", "You cannot access another branch");
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, businessId: req.user.businessId },
      select: { id: true },
    });
    if (!branch) {
      throw new AppError(403, "BRANCH_REQUIRED", "Select an available branch");
    }

    req.branchId = branch.id;
    req.user.role = user.role as Role;
    req.user.branchId = branch.id;
    next();
  } catch (error) {
    next(error);
  }
}
