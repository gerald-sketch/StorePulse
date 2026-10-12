import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { CheckoutInput } from "@sb/shared";

interface CartLine {
  productId: string;
  quantity: number;
  name: string;
  sku: string;
  unitPrice: number;
  lineTotal: number;
}

interface LockedProduct {
  id: string;
  stock: number;
  name: string;
  sku: string;
  price: string;
}

export async function checkout(
  businessId: string,
  branchId: string,
  userId: string,
  input: CheckoutInput,
) {
  // Aggregate duplicate productIds so we deduct them once
  const qtyByProduct = new Map<string, number>();
  for (const item of input.items) {
    qtyByProduct.set(
      item.productId,
      (qtyByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }

  // Deterministic lock order prevents deadlocks between concurrent checkouts
  const sortedIds = [...qtyByProduct.keys()].sort();

  return prisma.$transaction(async (tx) => {
    // ─── 1. Lock each product row in sorted order ───
    const lockedProducts: LockedProduct[] = [];
    for (const id of sortedIds) {
      const product = await tx.product.findFirst({
        where: { id, businessId, deletedAt: null },
        select: { id: true },
      });
      if (!product) {
        throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
      }
      await tx.branchInventory.upsert({
        where: { branchId_productId: { branchId, productId: id } },
        create: { branchId, productId: id, stock: 0 },
        update: {},
      });
      const rows = await tx.$queryRaw<LockedProduct[]>`
        SELECT p.id, i.stock, p.name, p.sku, p.price::text AS price
        FROM "Product" p
        JOIN "BranchInventory" i
          ON i."productId" = p.id AND i."branchId" = ${branchId}
        WHERE p.id::text = ${id}
          AND p."businessId"::text = ${businessId}
          AND p."deletedAt" IS NULL
        FOR UPDATE OF p, i
      `;
      if (rows.length === 0) {
        throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found");
      }
      lockedProducts.push(rows[0]);
    }

    // ─── 2. Build cart and validate stock ───
    const cart: CartLine[] = [];
    for (const p of lockedProducts) {
      const qty = qtyByProduct.get(p.id);
      if (qty === undefined) continue;

      if (p.stock < qty) {
        throw new AppError(
          400,
          "INSUFFICIENT_STOCK",
          `Insufficient stock for "${p.name}". Available: ${p.stock}, requested: ${qty}`,
        );
      }
      const unitPrice = Number(p.price);
      const expectedPrice = input.expectedPrices?.find(
        (item) => item.productId === p.id,
      )?.unitPrice;
      if (expectedPrice !== undefined && expectedPrice !== unitPrice) {
        throw new AppError(
          409,
          "PRICE_CHANGED",
          `The price for "${p.name}" changed. Review the sale and try again.`,
        );
      }
      cart.push({
        productId: p.id,
        quantity: qty,
        name: p.name,
        sku: p.sku,
        unitPrice,
        lineTotal: unitPrice * qty,
      });
    }

    // ─── 3. Compute totals ───
    const subtotal = cart.reduce((sum, l) => sum + l.lineTotal, 0);
    const discount = input.discount ?? 0;
    if (discount > subtotal) {
      throw new AppError(
        400,
        "INVALID_DISCOUNT",
        "Discount cannot exceed subtotal",
      );
    }
    const taxable = subtotal - discount;

    // ─── 4. VAT-inclusive pricing (Philippine BIR standard) ───
    // The shelf price already includes VAT. We extract the VAT portion
    // for reporting; we do NOT add it on top of the total.
    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: { taxRate: true },
    });
    const taxRate = Number(business?.taxRate ?? 0);

    const total = Math.round(taxable * 100) / 100;
    const tax =
      taxRate > 0 ? Math.round((total - total / (1 + taxRate)) * 100) / 100 : 0;

    // ─── 5. Cash tender validation ───
    let amountTendered: number | null = null;
    let changeDue: number | null = null;

    if (input.paymentMethod === "CASH") {
      if (input.amountTendered === undefined) {
        throw new AppError(
          400,
          "TENDER_REQUIRED",
          "Cash payment requires the amount tendered",
        );
      }
      if (input.amountTendered < total) {
        throw new AppError(
          400,
          "INSUFFICIENT_TENDER",
          `Cash received (₱${input.amountTendered.toFixed(2)}) is less than total (₱${total.toFixed(2)})`,
        );
      }
      amountTendered = Math.round(input.amountTendered * 100) / 100;
      changeDue = Math.round((amountTendered - total) * 100) / 100;
    }

    // ─── 6. Validate customer (if provided) ───
    if (input.customerId) {
      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, businessId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer not found");
      }
    }

    // ─── 7. Deduct stock for each product ───
    for (const line of cart) {
      await tx.branchInventory.update({
        where: {
          branchId_productId: { branchId, productId: line.productId },
        },
        data: { stock: { decrement: line.quantity } },
      });
    }

    // ─── 8. Create Sale + SaleItems ───
    const sale = await tx.sale.create({
      data: {
        businessId,
        branchId,
        customerId: input.customerId ?? null,
        userId,
        subtotal,
        discount,
        tax,
        total,
        amountTendered,
        changeDue,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference ?? null,
        items: {
          create: cart.map((line) => ({
            productId: line.productId,
            name: line.name,
            sku: line.sku,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    // ─── 9. Award loyalty points (1 point per ₱100 spent) ───
    if (input.customerId) {
      const earned = Math.floor(total / 100);
      if (earned > 0) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: { loyaltyPoints: { increment: earned } },
        });
      }
    }

    return sale;
  });
}

export async function listSales(
  businessId: string,
  branchId: string,
  page: number,
  limit: number,
) {
  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId, branchId, deletedAt: null },
      include: {
        items: true,
        customer: { select: { id: true, name: true } },
        user: { select: { name: true } },
      },
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sale.count({ where: { businessId, branchId, deletedAt: null } }),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getSale(businessId: string, branchId: string, id: string) {
  const sale = await prisma.sale.findFirst({
    where: { id, businessId, branchId, deletedAt: null },
    include: {
      items: true,
      customer: true,
      user: { select: { name: true } },
    },
  });
  if (!sale) throw new AppError(404, "NOT_FOUND", "Sale not found");
  return sale;
}
