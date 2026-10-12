import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { CreateExpenseInput, UpdateExpenseInput } from "@sb/shared";

export async function list(
  businessId: string,
  branchId: string,
  page: number,
  limit: number,
  category?: string,
) {
  const where = {
    businessId,
    branchId,
    deletedAt: null,
    ...(category ? { category } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { spentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function create(
  businessId: string,
  branchId: string,
  userId: string,
  input: CreateExpenseInput,
) {
  return prisma.expense.create({
    data: {
      businessId,
      branchId,
      userId,
      category: input.category,
      description: input.description,
      amount: input.amount,
      spentAt: input.spentAt ?? new Date(),
    },
  });
}

export async function update(
  businessId: string,
  branchId: string,
  id: string,
  input: UpdateExpenseInput,
) {
  const existing = await prisma.expense.findFirst({
    where: { id, businessId, branchId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");

  return prisma.expense.update({
    where: { id },
    data: {
      ...(input.category !== undefined && { category: input.category }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.spentAt !== undefined && { spentAt: input.spentAt }),
    },
  });
}

export async function softDelete(businessId: string, branchId: string, id: string) {
  const existing = await prisma.expense.findFirst({
    where: { id, businessId, branchId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");
  await prisma.expense.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Monthly totals by category — used by Reports.
 */
export async function monthlySummary(
  businessId: string,
  branchId: string,
  year: number,
  month: number,
) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.expense.groupBy({
    by: ["category"],
    where: {
      businessId,
      branchId,
      deletedAt: null,
      spentAt: { gte: start, lt: end },
    },
    _sum: { amount: true },
    _count: true,
  });

  const total = rows.reduce((sum, r) => sum + Number(r._sum.amount ?? 0), 0);

  return {
    year,
    month,
    total: Math.round(total * 100) / 100,
    byCategory: rows.map((r) => ({
      category: r.category,
      total: Math.round(Number(r._sum.amount ?? 0) * 100) / 100,
      count: r._count,
    })),
  };
}
