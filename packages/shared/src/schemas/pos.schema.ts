import { z } from "zod";

export const PaymentMethodEnum = z.enum(["CASH", "GCASH", "MAYA"]);

export const SaleItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const CheckoutSchema = z
  .object({
    items: z.array(SaleItemInputSchema).min(1).max(100),
    expectedPrices: z
      .array(
        z.object({
          productId: z.string().uuid(),
          unitPrice: z.number().nonnegative(),
        }),
      )
      .optional(),
    customerId: z.string().uuid().optional(),
    discount: z.number().nonnegative().default(0),
    paymentMethod: PaymentMethodEnum,
    amountTendered: z.number().nonnegative().optional(),
    paymentReference: z.string().max(64).optional(),
  })
  .superRefine((data, ctx) => {
    // GCash and Maya require a reference number for reconciliation
    if (data.paymentMethod !== "CASH") {
      const ref = data.paymentReference?.trim();
      if (!ref) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentReference"],
          message: `${data.paymentMethod === "GCASH" ? "GCash" : "Maya"} payment requires a reference number`,
        });
      }
    }

    // Cash requires amount tendered
    if (data.paymentMethod === "CASH" && data.amountTendered === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountTendered"],
        message: "Cash payment requires the amount tendered",
      });
    }
  });

export type CheckoutInput = z.infer<typeof CheckoutSchema>;
