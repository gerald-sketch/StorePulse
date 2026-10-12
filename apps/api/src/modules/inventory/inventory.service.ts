import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { AdjustStockInput, StockInInput, StockOutInput } from "@sb/shared";

/**
 * Apply a stock delta atomically.
 *
 * Uses SELECT ... FOR UPDATE inside a transaction so two concurrent
 * adjustments on the same product serialize. Without this, both could
 * read stock=10, both subtract 8, and end at stock=2 instead of -6.
 */
async function applyDelta(
  businessId: string,
  branchId: string,
  productId: string,
  delta: number,
  _reason: string,
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new AppError(404, "NOT_FOUND", "Product not found");
    }
    await tx.branchInventory.upsert({
      where: { branchId_productId: { branchId, productId } },
      create: { branchId, productId, stock: 0 },
      update: {},
    });
    const rows = await tx.$queryRaw<
      Array<{ id: string; stock: number; name: string }>
    >`
      SELECT i.id, i.stock, p.name
      FROM "BranchInventory" i
      JOIN "Product" p ON p.id = i."productId"
      WHERE i."branchId" = ${branchId}
        AND i."productId"::text = ${productId}
        AND p."businessId"::text = ${businessId}
        AND p."deletedAt" IS NULL
      FOR UPDATE OF i
    `;

    if (rows.length === 0) {
      throw new AppError(404, "NOT_FOUND", "Product not found");
    }

    const current = rows[0].stock;
    const next = current + delta;

    if (next < 0) {
      throw new AppError(
        400,
        "INSUFFICIENT_STOCK",
        `Insufficient stock for "${rows[0].name}". Available: ${current}, requested: ${Math.abs(delta)}`,
      );
    }

    await tx.branchInventory.update({
      where: { branchId_productId: { branchId, productId } },
      data: { stock: next },
    });
    const updated = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return {
      product: { ...updated, stock: next },
      previous: current,
      delta,
    };
  });
}

export async function adjust(
  businessId: string,
  branchId: string,
  input: AdjustStockInput,
) {
  return applyDelta(businessId, branchId, input.productId, input.delta, input.reason);
}

export async function stockIn(
  businessId: string,
  branchId: string,
  input: StockInInput,
) {
  return applyDelta(businessId, branchId, input.productId, input.quantity, input.reason);
}

export async function stockOut(
  businessId: string,
  branchId: string,
  input: StockOutInput,
) {
  return applyDelta(
    businessId,
    branchId,
    input.productId,
    -input.quantity,
    input.reason,
  );
}

export async function lowStock(
  businessId: string,
  branchId: string,
  threshold = 5,
) {
  const products = await prisma.product.findMany({
    where: {
      businessId,
      deletedAt: null,
      inventory: { some: { branchId, stock: { lte: threshold } } },
    },
    include: {
      inventory: { where: { branchId }, select: { stock: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
    take: 50,
  });
  return products.map(({ inventory, ...product }) => ({
    ...product,
    stock: inventory[0]?.stock ?? 0,
  }));
}
