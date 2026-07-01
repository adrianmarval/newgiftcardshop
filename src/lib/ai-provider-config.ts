import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

export interface AIProviderConfigResponse {
  id: string;
  name: string;
  label: string;
  model: string;
  baseUrl: string | null;
  apiKeyMasked: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIProviderConfigFull extends AIProviderConfigResponse {
  apiKey: string; // decrypted
}

function maskApiKey(encrypted: string): string {
  try {
    const decrypted = decrypt(encrypted);
    if (decrypted.length <= 8) return '••••••••';
    return `${decrypted.slice(0, 4)}••••••••${decrypted.slice(-4)}`;
  } catch {
    return '••••••••';
  }
}

function toResponse(row: any): AIProviderConfigResponse {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    model: row.model,
    baseUrl: row.baseUrl,
    apiKeyMasked: maskApiKey(row.apiKey),
    isActive: row.isActive,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getAllProviders(): Promise<AIProviderConfigResponse[]> {
  const rows = await prisma.aIProviderConfig.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return rows.map(toResponse);
}

export async function getProviderById(id: string): Promise<AIProviderConfigFull | null> {
  const row = await prisma.aIProviderConfig.findUnique({ where: { id } });
  if (!row) return null;
  return { ...toResponse(row), apiKey: decrypt(row.apiKey) };
}

export async function getActiveProvider(): Promise<AIProviderConfigFull | null> {
  const row = await prisma.aIProviderConfig.findFirst({ where: { isActive: true } });
  if (!row) {
    // Fallback to default provider
    const fallback = await prisma.aIProviderConfig.findFirst({ where: { isDefault: true } });
    if (!fallback) return null;
    return { ...toResponse(fallback), apiKey: decrypt(fallback.apiKey) };
  }
  return { ...toResponse(row), apiKey: decrypt(row.apiKey) };
}

export async function createProvider(data: {
  name: string;
  label: string;
  model: string;
  baseUrl?: string | null;
  apiKey: string;
  isActive?: boolean;
  isDefault?: boolean;
}): Promise<AIProviderConfigResponse> {
  // If setting as active, deactivate all others
  if (data.isActive) {
    await prisma.aIProviderConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }

  // If setting as default, unset other defaults
  if (data.isDefault) {
    await prisma.aIProviderConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const row = await prisma.aIProviderConfig.create({
    data: {
      name: data.name,
      label: data.label,
      model: data.model,
      baseUrl: data.baseUrl ?? null,
      apiKey: encrypt(data.apiKey),
      isActive: data.isActive ?? false,
      isDefault: data.isDefault ?? false,
    },
  });

  return toResponse(row);
}

export async function updateProvider(
  id: string,
  data: {
    name?: string;
    label?: string;
    model?: string;
    baseUrl?: string | null;
    apiKey?: string;
    isActive?: boolean;
    isDefault?: boolean;
  }
): Promise<AIProviderConfigResponse> {
  // If setting as active, deactivate all others
  if (data.isActive) {
    await prisma.aIProviderConfig.updateMany({
      where: { isActive: true, id: { not: id } },
      data: { isActive: false },
    });
  }

  // If setting as default, unset other defaults
  if (data.isDefault) {
    await prisma.aIProviderConfig.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const updateData: any = { ...data };
  if (data.apiKey) {
    updateData.apiKey = encrypt(data.apiKey);
  }

  const row = await prisma.aIProviderConfig.update({
    where: { id },
    data: updateData,
  });

  return toResponse(row);
}

export async function deleteProvider(id: string): Promise<void> {
  const row = await prisma.aIProviderConfig.findUnique({ where: { id } });
  if (!row) throw new Error('Provider not found');

  await prisma.aIProviderConfig.delete({ where: { id } });

  // If deleted provider was active or default, set another as default
  if (row.isActive || row.isDefault) {
    const remaining = await prisma.aIProviderConfig.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (remaining) {
      await prisma.aIProviderConfig.update({
        where: { id: remaining.id },
        data: { isDefault: true, ...(row.isActive ? { isActive: true } : {}) },
      });
    }
  }
}

export async function setActiveProvider(id: string): Promise<AIProviderConfigResponse> {
  await prisma.aIProviderConfig.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  const row = await prisma.aIProviderConfig.update({
    where: { id },
    data: { isActive: true },
  });

  return toResponse(row);
}
