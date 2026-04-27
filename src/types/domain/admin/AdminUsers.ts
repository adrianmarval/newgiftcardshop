import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']),
  isActive: z.boolean(),
  creditLimit: z.number(),
  buyRate: z.number(),
  sellRate: z.number(),
  createdAt: z.date(),
});

export const updateUserSchema = z.object({
  userId: z.string(),
  role: z.enum(['ADMIN', 'SELLER', 'BUYER']).optional(),
  isActive: z.boolean().optional(),
  creditLimit: z.number().optional(),
  buyRate: z.number().optional(),
  sellRate: z.number().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const getUsersInputSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  search: z.string().optional().default(''),
  role: z.enum(['ALL', 'ADMIN', 'SELLER', 'BUYER']).optional().default('ALL'),
});

export type GetUsersInput = z.infer<typeof getUsersInputSchema>;

import { paginatedOutputSchema } from '@/types/application/shared/Pagination';

export const getUsersOutputSchema = paginatedOutputSchema(z.array(userSchema));

export type GetUsersOutput = z.infer<typeof getUsersOutputSchema>;
