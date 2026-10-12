import "dotenv/config";
import { z } from "zod";
import type { StringValue } from "ms";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  JWT_ACCESS_EXPIRES: z.string().default("15m") as z.ZodType<StringValue>,

  JWT_REFRESH_EXPIRES: z.string().default("7d") as z.ZodType<StringValue>,

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,https://storepulsee.vercel.app"),

  APP_URL: z.string().default("https://storepulsee.vercel.app"),

  // Email
  EMAIL_USER: z.string().email().optional(),

  EMAIL_APP_PASSWORD: z.string().min(16).optional(),

  // PayMongo
  PAYMONGO_SECRET_KEY: z.string().optional(),

  PAYMONGO_PUBLIC_KEY: z.string().optional(),

  PAYMONGO_WEBHOOK_SECRET: z.string().optional(),

  PAYMONGO_SUCCESS_URL: z
    .string()
    .default("http://localhost:5173/billing/success"),

  PAYMONGO_CANCEL_URL: z
    .string()
    .default("http://localhost:5173/billing/cancel"),
});

export const env = EnvSchema.parse(process.env);
