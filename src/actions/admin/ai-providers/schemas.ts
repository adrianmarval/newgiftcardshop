import { z } from 'zod';

export const createAIProviderSchema = z.object({
  name: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  baseUrl: z.string().url().optional().nullable(),
  apiKey: z.string().min(1),
  isActive: z.boolean().optional().default(false),
  isDefault: z.boolean().optional().default(false),
});

export const updateAIProviderSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(50).optional(),
  label: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  baseUrl: z.string().url().optional().nullable(),
  apiKey: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const setActiveAIProviderSchema = z.object({
  id: z.string().cuid(),
});

export const deleteAIProviderSchema = z.object({
  id: z.string().cuid(),
});
