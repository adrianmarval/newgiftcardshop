import { createSafeActionClient } from 'next-safe-action';
import { auth } from './auth';
import { betterAuth } from '@next-safe-action/adapter-better-auth';
import { Role } from '@/generated/prisma/enums';
import { unauthorized } from 'next/navigation';

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

// 1. Cliente Base
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof ActionError) return e.message;
    console.error('Error de servidor:', e);
    return 'Error inesperado en el sistema.';
  },
});

// 2. Cliente Autenticado (Ahora inyecta un ARRAY de roles)
export const authActionClient = actionClient.use(betterAuth(auth));

// -------------------------------------------------------------
// CLIENTES DE ROLES ESPECÍFICOS (Usando .includes)
// -------------------------------------------------------------

// Cliente para VENDEDORES (Permite si tiene 'seller' o 'admin' en su array)
export const sellerActionClient = actionClient.use(
  betterAuth(auth, {
    authorize: ({ authData, next }) => {
      if (!authData) unauthorized();
      const isSeller = (authData.user.role as Role[]).includes('SELLER');
      const isAdmin = (authData.user.role as Role[]).includes('ADMIN');
      if (!isSeller && !isAdmin) unauthorized();
      return next({ ctx: { auth: authData } });
    },
  }),
);

// Cliente para COMPRADORES (Permite si tiene 'buyer' o 'admin' en su array)
export const buyerActionClient = actionClient.use(
  betterAuth(auth, {
    authorize: ({ authData, next }) => {
      if (!authData) unauthorized();
      const isBuyer = (authData.user.role as Role[]).includes('BUYER');
      const isAdmin = (authData.user.role as Role[]).includes('ADMIN');
      if (!isBuyer && !isAdmin) unauthorized();
      return next({ ctx: { auth: authData } });
    },
  }),
);

// Cliente para ADMINISTRADORES (Permite SOLO si tiene 'admin' en su array)
export const adminActionClient = actionClient.use(
  betterAuth(auth, {
    authorize: ({ authData, next }) => {
      if (!authData) unauthorized();
      const isAdmin = (authData.user.role as Role[]).includes('ADMIN');
      if (!isAdmin) unauthorized();
      return next({ ctx: { auth: authData } });
    },
  }),
);
