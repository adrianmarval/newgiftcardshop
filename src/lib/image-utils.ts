// lib/image-utils.ts
// Sharp-based image compression for provenance screenshots

import sharp from 'sharp';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 80;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB before compression

export interface CompressedImage {
  buffer: Buffer;
  mimeType: string;
  originalSize: number;
}

/**
 * Compress an image file for provenance storage.
 * - Resizes to max 1200px on longest side
 * - Converts to JPEG quality 80
 * - Returns original file size for audit trail
 *
 * @throws Error if file is not an image or exceeds max size
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  const originalSize = file.size;

  if (originalSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  // Validate it's actually an image
  if (!file.type.startsWith('image/')) {
    throw new Error('File is not an image');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Check minimum size (1 byte)
  if (buffer.length < 1) {
    throw new Error('File is empty or too small');
  }

  try {
    const compressed = await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return {
      buffer: compressed,
      mimeType: 'image/jpeg', // Always JPEG after compression
      originalSize,
    };
  } catch (error) {
    // Sharp failed to process the image
    throw new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
