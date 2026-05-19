import type { Role } from '@/generated/prisma/client';

export type TelegramUserSessionData = {
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  photoUrl: string | null;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  role: Role;
  isActive: boolean;
  twoFactorEnabled: boolean | null;
  twoFactor: { secret: string; backupCodes: string } | null;
  createdAt: Date;
  updatedAt: Date;
  telegramUser?: TelegramUserSessionData | null;
};

export type Session = {
  session: {
    id: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  };
  user: SessionUser;
};