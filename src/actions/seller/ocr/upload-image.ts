'use server';

import { ActionError, sellerActionClient } from '@/lib/safe-action';
import { compressImage } from '@/lib/image-utils';
import { uploadImageInputSchema } from './schemas';

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