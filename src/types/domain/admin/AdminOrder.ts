// ─────────────────────────────────────────────────────────────────────────────
// Admin — Order entity for admin dashboard
// Extended version of BuyerOrder with buyer info for admin management.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { giftcardSchema } from '@/types/domain/giftcard/Giftcard';
import { paymentSchema } from '@/types/domain/payment/Payment';
import { orderStatusEnum } from '@/types/domain/order';

const buyerInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  buyRate: z.number(),
  orderCount: z.number(),
  createdAt: z.string(),
  twoFactorEnabled: z.boolean(),
});

export const giftcardWithSellerSchema = giftcardSchema.extend({
  seller: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .nullable(),
});

export const adminOrderSchema = z.object({
  id: z.string(),
  status: orderStatusEnum,
  total: z.number(),
  adjustedTotal: z.number().nullable(),
  buyRate: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  giftcards: z.array(giftcardWithSellerSchema),
  payments: z.array(paymentSchema),
  effectiveTotal: z.number(),
  faceValueTotal: z.number(),
  buyer: buyerInfoSchema,
});

export type AdminOrder = z.infer<typeof adminOrderSchema>;

export const adminOrdersOutputSchema = z.object({
  success: z.literal(true),
  items: z.array(adminOrderSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
  }),
});

export type AdminOrdersOutput = z.infer<typeof adminOrdersOutputSchema>;

export const adminGetBuyersOutputSchema = z.object({
  success: z.literal(true),
  buyers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  ),
});

export type AdminGetBuyersOutput = z.infer<typeof adminGetBuyersOutputSchema>;

export const adminGetAdminsOutputSchema = z.object({
  success: z.literal(true),
  admins: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  ),
});

export type AdminGetAdminsOutput = z.infer<typeof adminGetAdminsOutputSchema>;

export const adminReportManageInputSchema = z.object({
  action: z.enum(['ADD', 'UPDATE', 'DELETE']),
  giftcardId: z.string(),
  orderId: z.string(),
  issueType: z.enum(['INVALID', 'ALREADY_USED', 'DEACTIVATED', 'WRONG_AMOUNT']).optional(),
  reportedAmount: z.number().optional(),
});

export type AdminReportManageInput = z.infer<typeof adminReportManageInputSchema>;

export const adminReportManageOutputSchema = z.union([z.object({ success: z.literal(true) }), z.object({ error: z.string() })]);

export const adminCancelOrderInputSchema = z.object({ orderId: z.string() });

export type AdminCancelOrderInput = z.infer<typeof adminCancelOrderInputSchema>;

export const adminCancelOrderOutputSchema = z.union([
  z.object({ success: z.literal(true), message: z.string() }),
  z.object({ error: z.string() }),
]);
