// ─────────────────────────────────────────────────────────────────────────────
// Admin / Coins — Server action schemas
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ── Coin ─────────────────────────────────────────────────────────────────────

export const coinOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  isActive: z.boolean(),
});

export const listCoinsOutputSchema = z.object({
  success: z.literal(true),
  coins: z.array(
    coinOutputSchema.extend({
      networks: z.array(
        z.object({
          id: z.string(),
          coinId: z.string(),
          networkId: z.string(),
          network: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string(),
            regex: z.string(),
            isActive: z.boolean(),
          }),
        }),
      ),
    }),
  ),
});

export const createCoinInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  symbol: z.string().trim().min(1, 'Symbol is required').toUpperCase(),
  decimals: z.number().int().min(0).max(18).default(18),
});

export const createCoinOutputSchema = z.object({
  success: z.literal(true),
  coin: coinOutputSchema,
});

export const updateCoinInputSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Name is required'),
  symbol: z.string().trim().min(1, 'Symbol is required').toUpperCase(),
  decimals: z.number().int().min(0).max(18),
});

export const updateCoinOutputSchema = z.object({
  success: z.literal(true),
  coin: coinOutputSchema,
});

export const deleteCoinInputSchema = z.object({ id: z.string() });
export const deleteCoinOutputSchema = z.object({ success: z.literal(true) });

export const toggleCoinActiveInputSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});
export const toggleCoinActiveOutputSchema = z.object({ success: z.literal(true) });

// ── Network ──────────────────────────────────────────────────────────────────

export const networkOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  regex: z.string(),
  isActive: z.boolean(),
});

export const listNetworksOutputSchema = z.object({
  success: z.literal(true),
  networks: z.array(
    networkOutputSchema.extend({
      coins: z.array(
        z.object({
          id: z.string(),
          coinId: z.string(),
          networkId: z.string(),
          coin: z.object({
            id: z.string(),
            name: z.string(),
            symbol: z.string(),
            decimals: z.number(),
            isActive: z.boolean(),
          }),
        }),
      ),
    }),
  ),
});

export const createNetworkInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().default(''),
  regex: z.string().trim().min(1, 'Regex is required'),
});

export const createNetworkOutputSchema = z.object({
  success: z.literal(true),
  network: networkOutputSchema,
});

export const updateNetworkInputSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim(),
  regex: z.string().trim().min(1, 'Regex is required'),
});

export const updateNetworkOutputSchema = z.object({
  success: z.literal(true),
  network: networkOutputSchema,
});

export const deleteNetworkInputSchema = z.object({ id: z.string() });
export const deleteNetworkOutputSchema = z.object({ success: z.literal(true) });

export const toggleNetworkActiveInputSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
});
export const toggleNetworkActiveOutputSchema = z.object({ success: z.literal(true) });

// ── Coin ↔ Network ──────────────────────────────────────────────────────────

export const addNetworkToCoinInputSchema = z.object({
  coinId: z.string(),
  networkId: z.string(),
});
export const addNetworkToCoinOutputSchema = z.object({ success: z.literal(true) });

export const removeNetworkFromCoinInputSchema = z.object({
  coinId: z.string(),
  networkId: z.string(),
});
export const removeNetworkFromCoinOutputSchema = z.object({ success: z.literal(true) });
