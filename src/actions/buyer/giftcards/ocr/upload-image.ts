'use server';

import { z } from 'zod';
import { sellerActionClient } from '@/lib/safe-action';
import { compressImage } from '@/lib/image-utils';

const uploadImageInputSchema = z.object({ file: z.instanceof(File) });

const uploadImageOutputSchema = z.union([
  z.object({ success: z.literal(true), compressedData: z.string(), mimeType: z.string() }),
  z.object({ error: z.string() }),
]);

export const uploadImage = sellerActionClient
  .inputSchema(uploadImageInputSchema)
  .outputSchema(uploadImageOutputSchema)
  .action(async ({ parsedInput: { file } }) => {
    try {
      const { buffer, mimeType } = await compressImage(file);
      return { success: true as const, compressedData: buffer.toString('base64'), mimeType };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to upload provenance image' };
    }
  });
