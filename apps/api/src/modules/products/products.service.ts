import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { CreateProductInput, UpdateProductInput } from "@sb/shared";
import { Prisma } from "../../generated/prisma/client";

export async function list(
  businessId: string,
  branchId: string,
  page: number,
  limit: number,
  search?: string,
  categoryId?: string,
) {
  const where: Prisma.ProductWhereInput = {
    businessId,
    deletedAt: null,
    ...(categoryId ? { categoryId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        inventory: { where: { branchId }, select: { stock: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map(({ inventory, ...product }) => ({
      ...product,
      stock: inventory[0]?.stock ?? 0,
    })),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getById(
  businessId: string,
  branchId: string,
  id: string,
) {
  const product = await prisma.product.findFirst({
    where: { id, businessId, deletedAt: null },
    include: {
      category: { select: { id: true, name: true } },
      inventory: { where: { branchId }, select: { stock: true } },
    },
  });
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found");
  const { inventory, ...details } = product;
  return { ...details, stock: inventory[0]?.stock ?? 0 };
}

async function assertCategoryBelongsToBusiness(
  businessId: string,
  categoryId: string | null | undefined,
) {
  if (!categoryId) return;
  const category = await prisma.category.findFirst({
    where: { id: categoryId, businessId, deletedAt: null },
    select: { id: true },
  });
  if (!category) {
    throw new AppError(400, "INVALID_CATEGORY", "Category not found");
  }
}

export async function create(
  businessId: string,
  branchId: string,
  _userId: string,
  input: CreateProductInput,
) {
  await assertCategoryBelongsToBusiness(businessId, input.categoryId);

  const existing = await prisma.product.findFirst({
    where: { businessId, sku: input.sku, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, "SKU_TAKEN", "SKU already exists in this business");
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        businessId,
        name: input.name,
        sku: input.sku,
        categoryId: input.categoryId ?? null,
        price: input.price,
        cost: input.cost,
        status: input.status,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    const branches = await tx.branch.findMany({
      where: { businessId },
      select: { id: true },
    });
    await tx.branchInventory.createMany({
      data: branches.map((branch) => ({
        branchId: branch.id,
        productId: product.id,
        stock: branch.id === branchId ? input.stock : 0,
      })),
    });
    return { ...product, stock: input.stock };
  });
}

export async function update(
  businessId: string,
  branchId: string,
  id: string,
  input: UpdateProductInput,
) {
  await getById(businessId, branchId, id);

  if (input.categoryId !== undefined) {
    await assertCategoryBelongsToBusiness(businessId, input.categoryId);
  }

  if (input.sku) {
    const conflicting = await prisma.product.findFirst({
      where: { businessId, sku: input.sku, id: { not: id }, deletedAt: null },
      select: { id: true },
    });
    if (conflicting) {
      throw new AppError(
        409,
        "SKU_TAKEN",
        "SKU already exists in this business",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.sku !== undefined && { sku: input.sku }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.cost !== undefined && { cost: input.cost }),
        ...(input.status !== undefined && { status: input.status }),
      },
      include: { category: { select: { id: true, name: true } } },
    });
    const inventory =
      input.stock === undefined
        ? await tx.branchInventory.findUnique({
            where: { branchId_productId: { branchId, productId: id } },
            select: { stock: true },
          })
        : await tx.branchInventory.upsert({
            where: { branchId_productId: { branchId, productId: id } },
            create: { branchId, productId: id, stock: input.stock },
            update: { stock: input.stock },
            select: { stock: true },
          });
    return { ...product, stock: inventory?.stock ?? 0 };
  });
}

export async function softDelete(
  businessId: string,
  branchId: string,
  id: string,
) {
  await getById(businessId, branchId, id);
  return prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
