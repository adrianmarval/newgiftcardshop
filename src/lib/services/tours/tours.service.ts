import prisma from '@/lib/prisma';

export async function getToursSeenForUser(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { toursSeen: true },
  });

  return Array.isArray(user?.toursSeen) ? (user.toursSeen as string[]) : [];
}
