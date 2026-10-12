import { z } from "zod";

export const RoleEnum = z.enum(["OWNER", "MANAGER", "STAFF"]);

export const CreateEmployeeSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  role: RoleEnum.default("STAFF"),
  branchId: z.string().uuid(),
});

export const UpdateEmployeeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: RoleEnum.optional(),
  branchId: z.string().uuid().optional(),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
