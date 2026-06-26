'use server';

import { z } from 'zod';
import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { compressImage } from '@/lib/image-utils';

const uploadImageInputSchema = z.object({ file: z.instanceof(File) });

export const uploadImage = sellerActionClient
  .inputSchema(uploadImageInputSchema)
  .action(async ({ parsedInput: { file } }) => {
    try {
      const { buffer, mimeType } = await compressImage(file);
      return { compressedData: buffer.toString('base64'), mimeType };
    } catch (error) {
      throw new ActionError(error instanceof Error ? error.message : 'Failed to upload provenance image');
    }
  });
