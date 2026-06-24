import { createSafeActionClient } from 'next-safe-action';
import { auth } from './auth';
import { betterAuth } from '@next-safe-action/adapter-better-auth';
import { Role } from '@/generated/prisma/enums';
import { unauthorized } from 'next/navigation';
import type { Session } from '@/types';

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Clients — Choose the right client for your action
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base action client for unauthenticated operations.
 *
 * Use for: public actions like forgot-password, register, reset-password.
 * These actions run WITHOUT a user session - they should NEVER reference ctx.auth.
 *
 * @example
 * export const forgotPassword = actionClient
 *   .inputSchema(forgotPasswordSchema)
 *   .outputSchema(forgotPasswordOutputSchema)
 *   .action(async ({ parsedInput }) => { ... });
 */
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof ActionError) return e.message;
    console.error('Error de servidor:', e);
    return 'Error inesperado en el sistema.';
  },
});

/**
 * Authenticated action client - requires any valid session.
 *
 * Use for: actions that need user context but don't require specific roles.
 * The action body has access to ctx.auth.user.
 *
 * NOTE: Prefer the role-specific clients (buyerActionClient, sellerActionClient,
 * adminActionClient) when you need to enforce authorization.
 *
 * @example
 * export const getUserProfile = authActionClient
 *   .outputSchema(getUserProfileOutputSchema)
 *   .action(async ({ ctx }) => {
 *     // ctx.auth.user is available
 *     return { user: ctx.auth.user };
 *   });
 */
export const authActionClient = actionClient.use(
  betterAuth(auth, {
    authorize: ({ authData, next }) => {
      if (!authData) unauthorized();
      const user = authData.user as Session['user'];
      if (!user.isActive && user.role !== 'ADMIN') unauthorized();
      return next({ ctx: { auth: authData } });
    },
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Role-Specific Clients — Enforce authorization at the action level
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seller action client - requires SELLER or ADMIN role.
 *
 * Use for: seller-only actions like publishBatch, getSellerBatches, etc.
 * Throws unauthorized() if user lacks the required role.
 *
 * Method choice:
 * - .action() directly: for stateless logic with no DB reads or ctx injection needed
 * - .useValidated(): when you need to read from DB or inject additional ctx before the main action
 *
 * @example
 * export const publishBatch = sellerActionClient
 *   .inputSchema(publishBatchSchema)
 *   .outputSchema(publishBatchOutputSchema)
 *   .useValidated(async ({ parsedInput, ctx, next }) => {
 *     // DB read, validation, ctx injection
 *     const user = await prisma.user.findUnique(...);
 *     return next({ ctx: { user } });
 *   })
 *   .action(async ({ parsedInput, ctx }) => { ... });
 */
export const sellerActionClient = actionClient.use(
  betterAuth(auth, {
    authorize: ({ authData, next }) => {
      if (!authData) unauthorized();
      const user = authData.user as Session['user'];
      if (!user.isActive && user.role !== 'ADMIN') unauthorized();
      const role = user.role as Role;
      if (role !== 'SELLER' && role !== 'ADMIN') unauthorized();
      return next({ ctx: { auth: authData } });
    },
  }),
);

/**
 * Buyer action client - requires BUYER or ADMIN role.
 *
 * Use for: buyer-only actions like createOrder, confirmOrderUsage, getBuyerOrders, etc.
 * Throws unauthorized() if user lacks the required role.
 *
 * Method choice:
 * - .action() directly: for simple actions that only use parsedInput
 * - .useValidated(): for complex actions needing DB reads, additional validation, or ctx injection
 *
 * @example
 * export const createOrder = buyerActionClient
 *   .inputSchema(createOrderInputSchema)
 *   .outputSchema(createOrderOutputSchema)
 *   .useValidated(async ({ parsedInput, ctx, next }) => {
 *     const [user, cards] = await Promise.all([...]);
 *     return next({ ctx: { dbUser: user, giftcards: cards } });
 *   })
 *   .action(async ({ parsedInput, ctx }) => { ... });
 */
export const buyerActionClient = actionClient.use(
  betterAuth(auth, {
    authorize: ({ authData, next }) => {
      if (!authData) unauthorized();
      const user = authData.user as Session['user'];
      if (!user.isActive && user.role !== 'ADMIN') unauthorized();
      const role = user.role as Role;
      if (role !== 'BUYER' && role !== 'ADMIN') unauthorized();
      return next({ ctx: { auth: authData } });
    },
  }),
);

/**
 * Admin action client - requires ADMIN role ONLY.
 *
 * Use for: admin-only actions that should never be accessible to sellers or buyers.
 *
 * @example
 * export const adminGetAllUsers = adminActionClient
 *   .outputSchema(adminGetAllUsersOutputSchema)
 *   .action(async ({ ctx }) => { ... });
 */
export const adminActionClient = actionClient.use(
  betterAuth(auth, {
    authorize: ({ authData, next }) => {
      if (!authData) unauthorized();
      const user = authData.user as Session['user'];
      if (!user.isActive && user.role !== 'ADMIN') unauthorized();
      const role = user.role as Role;
      if (role !== 'ADMIN') unauthorized();
      return next({ ctx: { auth: authData } });
    },
  }),
);
