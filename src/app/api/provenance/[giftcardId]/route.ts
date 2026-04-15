import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/authorization';
import { decryptBuffer } from '@/lib/encryption';
import { notFound, unauthorized } from 'next/navigation';

export async function GET(request: Request, { params }: { params: Promise<{ giftcardId: string }> }) {
  try {
    // 1. Check authentication
    const session = await getSession();

    if (!session?.user) {
      unauthorized();
    }

    const { giftcardId } = await params;

    // 2. Find the provenance image with giftcard and order info
    const provenanceImage = await prisma.provenanceImage.findUnique({
      where: { giftcardId },
      include: {
        giftcard: {
          select: {
            ownerId: true,
            orderId: true,
            order: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    // 3. Check if not found
    if (!provenanceImage) {
      notFound();
    }

    // 4. Check permissions
    const isAdmin = session.user.role.includes('ADMIN');
    const isSeller = session.user.role.includes('SELLER');
    const isBuyer = session.user.role.includes('BUYER');

    const isOwner = provenanceImage.giftcard.ownerId === session.user.id;
    const isPurchaser = provenanceImage.giftcard.order?.userId === session.user.id;

    // Admin can always view
    // Seller (owner) can view their own cards
    // Buyer who purchased the card can view
    const hasPermission = isAdmin || (isSeller && isOwner) || (isBuyer && isPurchaser);

    if (!hasPermission) {
      notFound();
    }

    // 5. Decrypt the image data
    // Convert Prisma Bytes (Uint8Array) to Buffer for decryptBuffer
    const encryptedBuffer = Buffer.from(provenanceImage.data);
    const decryptedBuffer = decryptBuffer(encryptedBuffer);

    // 6. Return the decrypted image with correct content type
    return new NextResponse(new Uint8Array(decryptedBuffer), {
      status: 200,
      headers: {
        'Content-Type': provenanceImage.mimeType,
        'Content-Length': provenanceImage.size.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving provenance image:', error);
    return NextResponse.json({ error: 'Failed to retrieve provenance image' }, { status: 500 });
  }
}
