import bcrypt from "bcrypt";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";
import { RegisterInput, LoginInput } from "@sb/shared";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  Role,
} from "../../lib/jwt";
import { createHash, randomInt } from "node:crypto";
import { sendPasswordResetCode } from "../../lib/email";

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    businessId: string;
    businessName: string;
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: { name: input.businessName },
    });
    const branch = await tx.branch.create({
      data: {
        businessId: business.id,
        name: "Main Branch",
        isDefault: true,
      },
    });

    const user = await tx.user.create({
      data: {
        businessId: business.id,
        email: input.email,
        name: input.name,
        passwordHash,
        role: "OWNER",
        branchId: branch.id,
      },
    });

    return { business, branch, user };
  });

  const accessToken = signAccessToken({
    sub: result.user.id,
    businessId: result.business.id,
    role: result.user.role as Role,
  });
  const refreshToken = signRefreshToken({ sub: result.user.id });

  return {
    accessToken,
    refreshToken,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role as Role,
      businessId: result.business.id,
      businessName: result.business.name,
    },
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      businessId: true,
      passwordHash: true,
      business: { select: { name: true } },
    },
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    businessId: user.businessId,
    role: user.role as Role,
  });
  const refreshToken = signRefreshToken({ sub: user.id });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      businessId: user.businessId,
      businessName: user.business.name,
    },
  };
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      businessId: true,
      business: { select: { name: true } },
    },
  });
  if (!user) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "User no longer exists");
  }

  const newAccess = signAccessToken({
    sub: user.id,
    businessId: user.businessId,
    role: user.role as Role,
  });
  const newRefresh = signRefreshToken({ sub: user.id });

  return {
    accessToken: newAccess,
    refreshToken: newRefresh,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      businessId: user.businessId,
      businessName: user.business.name,
    },
  };
}

/* ─────────────────────────  Password reset  ───────────────────────── */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true, email: true, name: true },
  });

  // Anti-enumeration: always return success, whether the email exists or not
  if (!user) {
    console.log(`[Password Reset] Requested for unknown email: ${email}`);
    return;
  }

  // Invalidate any outstanding codes for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const code = generateSixDigitCode();
  const tokenHash = hashToken(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  await sendPasswordResetCode(user.email, code, user.name);
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  });

  // Uniform error — don't reveal whether the email exists
  if (!user) {
    throw new AppError(400, "INVALID_CODE", "Invalid or expired code");
  }

  const tokenHash = hashToken(code);

  const record = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, tokenHash },
  });

  if (!record) {
    throw new AppError(400, "INVALID_CODE", "Invalid or expired code");
  }
  if (record.usedAt) {
    throw new AppError(400, "CODE_USED", "This code has already been used");
  }
  if (record.expiresAt < new Date()) {
    throw new AppError(400, "CODE_EXPIRED", "This code has expired");
  }

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);
}
