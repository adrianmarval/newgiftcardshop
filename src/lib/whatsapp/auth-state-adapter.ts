import { AuthenticationState, initAuthCreds, SignalDataTypeMap } from '@whiskeysockets/baileys';
import prisma from '@/lib/prisma';

function parseBuffer(obj: unknown): Buffer | unknown {
  if (obj && typeof obj === 'object' && 'type' in obj && obj.type === 'Buffer' && 'data' in obj && Array.isArray(obj.data)) {
    return Buffer.from(obj.data);
  }
  if (obj && typeof obj === 'object') {
    const parsed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      parsed[key] = parseBuffer(value);
    }
    return parsed;
  }
  if (Array.isArray(obj)) {
    return obj.map(parseBuffer);
  }
  return obj;
}

function stringifyWithBuffers(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    if (Buffer.isBuffer(value)) {
      return { type: 'Buffer', data: Array.from(value) };
    }
    if (value instanceof Uint8Array) {
      return { type: 'Buffer', data: Array.from(value) };
    }
    return value;
  });
}

export async function useDbAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const rows = await prisma.whatsappAuthState.findMany();

  let creds: AuthenticationState['creds'];

  if (rows.length === 0) {
    creds = initAuthCreds();
  } else {
    const parsed: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        parsed[row.key] = parseBuffer(JSON.parse(row.data));
      } catch {
        // Ignored(row.key);
      }
    }
    creds = parsed.creds as AuthenticationState['creds'] ?? initAuthCreds();
  }

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const result: Record<string, SignalDataTypeMap[T]> = {} as Record<string, SignalDataTypeMap[T]>;
        for (const id of ids) {
          const key = `${type}:${id}`;
          const row = await prisma.whatsappAuthState.findUnique({ where: { key } });
          if (row) {
            try {
              result[id] = parseBuffer(JSON.parse(row.data)) as SignalDataTypeMap[T];
            } catch {
              // ignore parse errors
            }
          }
        }
        return result;
      },
      set: async (data: Record<string, unknown>): Promise<void> => {
        const entries = Object.entries(data);
        await prisma.$transaction(
          entries.map(([key, value]) =>
            prisma.whatsappAuthState.upsert({
              where: { key },
              create: { key, data: stringifyWithBuffers(value) },
              update: { data: stringifyWithBuffers(value) },
            })
          )
        );
      },
    },
  };

  const saveCreds = async (): Promise<void> => {
    await prisma.whatsappAuthState.upsert({
      where: { key: 'creds' },
      create: { key: 'creds', data: stringifyWithBuffers(state.creds) },
      update: { data: stringifyWithBuffers(state.creds) },
    });
  };

  return { state, saveCreds };
}