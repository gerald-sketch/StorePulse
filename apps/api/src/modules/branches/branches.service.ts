import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";

export async function list(
  businessId: string,
  userId: string,
  role: string,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, businessId, deletedAt: null },
    select: { branchId: true },
  });
  if (!user) throw new AppError(401, "UNAUTHORIZED", "User no longer exists");

  return prisma.branch.findMany({
    where: {
      businessId,
      ...(role === "OWNER" ? {} : { id: user.branchId }),
    },
    select: { id: true, name: true, address: true, isDefault: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function create(
  businessId: string,
  name: string,
  address?: string,
) {
  const normalizedName = name.trim();
  const existing = await prisma.branch.findFirst({
    where: { businessId, name: normalizedName },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, "BRANCH_EXISTS", "A branch with this name already exists");
  }

  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.create({
      data: {
        businessId,
        name: normalizedName,
        address: address?.trim() || null,
      },
      select: { id: true, name: true, address: true, isDefault: true },
    });
    const products = await tx.product.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true },
    });
    if (products.length) {
      await tx.branchInventory.createMany({
        data: products.map((product) => ({
          branchId: branch.id,
          productId: product.id,
          stock: 0,
        })),
      });
    }
    return branch;
  });
}
