import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "./errorHandler";

const HEADER = "idempotency-key";
const IN_PROGRESS = "IN_PROGRESS";

export function idempotent(endpoint: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const key = req.headers[HEADER] as string | undefined;

    // No key = no idempotency (client chose to skip it)
    if (!key) return next();

    if (key.length < 16 || key.length > 128) {
      return next(
        new AppError(
          400,
          "INVALID_IDEMPOTENCY_KEY",
          "Idempotency-Key must be 16-128 chars",
        ),
      );
    }

    const user = req.user;
    if (!user)
      return next(new AppError(401, "UNAUTHORIZED", "Not authenticated"));

    const uniqueKey = { businessId: user.businessId, key };

    const existing = await prisma.idempotencyKey.findUnique({
      where: { businessId_key: uniqueKey },
    });

    if (existing) {
      const storedStatus = (existing.response as { status?: string } | null)?.status;
      if (storedStatus === IN_PROGRESS) {
        res.status(202).json({
          error: "IDEMPOTENCY_IN_PROGRESS",
          message: "This request is already being processed.",
        });
        return;
      }

      res.status(existing.statusCode).json(existing.response);
      return;
    }

    try {
      await prisma.idempotencyKey.create({
        data: {
          key,
          userId: user.id,
          businessId: user.businessId,
          endpoint,
          statusCode: 202,
          response: { status: IN_PROGRESS },
        },
      });
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "P2002") {
        const replay = await prisma.idempotencyKey.findUnique({
          where: { businessId_key: uniqueKey },
        });
        if (replay) {
          const storedStatus = (replay.response as { status?: string } | null)?.status;
          if (storedStatus === IN_PROGRESS) {
            res.status(202).json({
              error: "IDEMPOTENCY_IN_PROGRESS",
              message: "This request is already being processed.",
            });
            return;
          }
          res.status(replay.statusCode).json(replay.response);
          return;
        }
      }
      console.error("[Idempotency reserve error]", error);
      return next(error as Error);
    }

    const originalJson = res.json.bind(res);
    let capturedBody: unknown = null;

    res.json = (body: unknown) => {
      capturedBody = body;
      return originalJson(body);
    };

    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && capturedBody !== null) {
        try {
          await prisma.idempotencyKey.update({
            where: { businessId_key: uniqueKey },
            data: {
              statusCode: res.statusCode,
              response: capturedBody as object,
            },
          });
        } catch (error: unknown) {
          console.error("[Idempotency store error]", error);
        }
        return;
      }

      try {
        await prisma.idempotencyKey.delete({
          where: { businessId_key: uniqueKey },
        });
      } catch (error: unknown) {
        const code = (error as { code?: string }).code;
        if (code !== "P2025") console.error("[Idempotency cleanup error]", error);
      }
    });

    next();
  };
}
