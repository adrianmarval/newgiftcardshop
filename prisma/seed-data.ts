import { Prisma } from '../src/generated/prisma/client';
import { hashPassword } from 'better-auth/crypto';

interface SeedData {
  coinData: Prisma.CoinCreateInput[];
  networkData: Prisma.NetworkCreateInput[];
  userData: Prisma.UserCreateInput[];
  countryData: Prisma.CountryCreateInput[];
  brandData: Prisma.BrandCreateInput[];
  brandCountryData: Prisma.BrandCountryCreateInput[];
  platformSettingData: Prisma.PlatformSettingsCreateInput[];
  aiProviderData: {
    name: string;
    label: string;
    model: string;
    baseUrl: string | null;
    apiKey: string;
    isActive: boolean;
    isDefault: boolean;
  }[];
}

export const seedData: SeedData = {
  coinData: [{ name: 'Tether', symbol: 'USDT', decimals: 6 }],
  networkData: [
    { name: 'BSC', description: 'BNB Smart Chain BEP20', regex: '^(0x)[0-9A-Fa-f]{40}$' },
    { name: 'TRX', description: 'Tron TRC20', regex: '^T[1-9A-HJ-NP-Za-km-z]{33}$' },
    { name: 'MATIC', description: 'Polygon POS', regex: '^(0x)[0-9A-Fa-f]{40}$' },
    { name: 'AVAXC', description: 'AVAX C-Chain', regex: '^(0x)[0-9A-Fa-f]{40}$' },
    { name: 'PLASMA', description: 'Plasma', regex: '^(0x)[0-9A-Fa-f]{40}$' },
  ],
  userData: [
    {
      name: 'Adrian Marval',
      email: 'adrian.marval@gmail.com',
      emailVerified: true,
      isActive: true,
      role: 'ADMIN',
      accounts: {
        create: {
          accountId: 'admin-account-provider-id',
          providerId: 'credential',
          password: await hashPassword('Adri891.'),
        },
      },
    },
    {
      name: 'Solmaira Maza',
      email: 'solmaira.maza@gmail.com',
      emailVerified: true,
      isActive: true,
      role: 'SELLER',
      accounts: {
        create: {
          accountId: 'seller-account-provider-id',
          providerId: 'credential',
          password: await hashPassword('Adri891.'),
        },
      },
    },
    {
      name: 'Dunia Marcano',
      email: 'gaget85reingerk542@gmail.com',
      emailVerified: true,
      isActive: true,
      role: 'BUYER',
      accounts: {
        create: {
          accountId: 'buyer-account-provider-id',
          providerId: 'credential',
          password: await hashPassword('Adri891.'),
        },
      },
    },
    {
      name: 'Jesus Marval',
      email: 'pagosqt@gmail.com',
      emailVerified: true,
      isActive: true,
      role: 'BUYER',
      accounts: {
        create: {
          accountId: 'buyer-account1-provider-id',
          providerId: 'credential',
          password: await hashPassword('Adri891.'),
        },
      },
    },
  ],
  countryData: [
    { code: 'US', name: 'United States', currency: 'USD' },
    { code: 'CA', name: 'Canada', currency: 'CAD' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  ],
  brandData: [
    { slug: 'amazon', name: 'Amazon', icon: '📦', image: '/images/amazonlogo.svg' },
    { slug: 'apple', name: 'Apple', icon: '🍎', image: '/images/applelogo.svg' },
    { slug: 'best-buy', name: 'Best Buy', icon: '🏷️', image: '/images/bestbuylogo.svg' },
    { slug: 'gamestop', name: 'GameStop', icon: '🎮', image: '/images/gamestoplogo.svg' },
    { slug: 'google-play', name: 'Google Play', icon: '🎯', image: '/images/googleplaylogo.svg' },
    { slug: 'home-depot', name: 'Home Depot', icon: '🛠️', image: '/images/homedepotlogo.svg' },
    { slug: 'macys', name: "Macy's", icon: '🏬', image: '/images/macyslogo.svg' },
    { slug: 'nike', name: 'Nike', icon: '✔️', image: '/images/nikelogo.svg' },
    { slug: 'sephora', name: 'Sephora', icon: '✨', image: '/images/sephoralogo.svg' },
    { slug: 'starbucks', name: 'Starbucks', icon: '☕', image: '/images/starbuckslogo.svg' },
    { slug: 'target', name: 'Target', icon: '🎯', image: '/images/targetlogo.svg' },
    { slug: 'walmart', name: 'Walmart', icon: '🛒', image: '/images/walmartlogo.svg' },
  ],
  brandCountryData: [
    {
      brand: { connect: { slug: 'amazon' } },
      country: { connect: { code: 'US' } },
      minAmount: 5,
      maxAmount: 500,
      isActive: true,
      claimCodePattern: '^[A-Z0-9]{14}$',
    },
    {
      brand: { connect: { slug: 'amazon' } },
      country: { connect: { code: 'CA' } },
      minAmount: 5,
      maxAmount: 200,
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{14}$',
    },
    {
      brand: { connect: { slug: 'amazon' } },
      country: { connect: { code: 'GB' } },
      minAmount: 5,
      maxAmount: 500,
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{14}$',
    },
    {
      brand: { connect: { slug: 'apple' } },
      country: { connect: { code: 'US' } },
      minAmount: 10,
      maxAmount: 1000,
      isActive: true,
      claimCodePattern: '^[A-Z0-9]{12,16}$',
    },
    { brand: { connect: { slug: 'apple' } }, country: { connect: { code: 'CA' } }, isActive: false, claimCodePattern: '^[A-Z0-9]{12,16}$' },
    { brand: { connect: { slug: 'apple' } }, country: { connect: { code: 'GB' } }, isActive: false, claimCodePattern: '^[A-Z0-9]{12,16}$' },
    {
      brand: { connect: { slug: 'best-buy' } },
      country: { connect: { code: 'US' } },
      minAmount: 10,
      maxAmount: 500,
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{15,16}$',
    },
    {
      brand: { connect: { slug: 'best-buy' } },
      country: { connect: { code: 'CA' } },
      minAmount: 10,
      maxAmount: 500,
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{15,16}$',
    },
    { brand: { connect: { slug: 'gamestop' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 200, isActive: false },
    { brand: { connect: { slug: 'gamestop' } }, country: { connect: { code: 'CA' } }, minAmount: 10, maxAmount: 200, isActive: false },
    {
      brand: { connect: { slug: 'google-play' } },
      country: { connect: { code: 'US' } },
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{14,18}$',
    },
    {
      brand: { connect: { slug: 'google-play' } },
      country: { connect: { code: 'CA' } },
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{14,18}$',
    },
    {
      brand: { connect: { slug: 'google-play' } },
      country: { connect: { code: 'GB' } },
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{14,18}$',
    },
    { brand: { connect: { slug: 'home-depot' } }, country: { connect: { code: 'US' } }, minAmount: 25, maxAmount: 500, isActive: false },
    { brand: { connect: { slug: 'home-depot' } }, country: { connect: { code: 'CA' } }, minAmount: 25, maxAmount: 500, isActive: false },
    { brand: { connect: { slug: 'macys' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 500, isActive: false },
    {
      brand: { connect: { slug: 'nike' } },
      country: { connect: { code: 'US' } },
      minAmount: 5,
      maxAmount: 500,
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{16}$',
    },
    { brand: { connect: { slug: 'nike' } }, country: { connect: { code: 'CA' } }, isActive: false, claimCodePattern: '^[A-Z0-9]{16}$' },
    { brand: { connect: { slug: 'nike' } }, country: { connect: { code: 'GB' } }, isActive: false, claimCodePattern: '^[A-Z0-9]{16}$' },
    { brand: { connect: { slug: 'sephora' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 500, isActive: false },
    { brand: { connect: { slug: 'sephora' } }, country: { connect: { code: 'CA' } }, minAmount: 10, maxAmount: 500, isActive: false },
    {
      brand: { connect: { slug: 'starbucks' } },
      country: { connect: { code: 'US' } },
      minAmount: 5,
      maxAmount: 200,
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{12}$',
    },
    {
      brand: { connect: { slug: 'starbucks' } },
      country: { connect: { code: 'CA' } },
      minAmount: 5,
      maxAmount: 200,
      isActive: false,
      claimCodePattern: '^[A-Z0-9]{12}$',
    },
    { brand: { connect: { slug: 'target' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 500, isActive: false },
    { brand: { connect: { slug: 'target' } }, country: { connect: { code: 'CA' } }, minAmount: 10, maxAmount: 500, isActive: false },
    { brand: { connect: { slug: 'walmart' } }, country: { connect: { code: 'US' } }, minAmount: 5, maxAmount: 500, isActive: false },
    { brand: { connect: { slug: 'walmart' } }, country: { connect: { code: 'CA' } }, minAmount: 5, maxAmount: 500, isActive: false },
  ],
  platformSettingData: [
    {
      balance: 0,
      key: 'platformBalance',
      description: 'Saldo disponible en la plataforma (auditoría)',
      value: '0',
    },
    {
      key: 'binance_pay_id',
      value: '57038454',
      description: 'ID de pago de Binance',
    },
    {
      key: 'escalation_enabled',
      value: 'true',
      description: 'Habilitar sistema de reserva escalonada de tarjetas',
    },
    {
      key: 'escalation_duration_minutes',
      value: '5',
      description: 'Duración de cada tier de escalación en minutos',
    },
    {
      key: 'escalation_drop_amount',
      value: '1',
      description: 'Cuánto baja el tier en cada ciclo de escalación',
    },
  ],
  aiProviderData: [
    {
      name: 'minimax',
      label: 'MiniMax M3',
      model: 'MiniMax-M3',
      baseUrl: 'https://api.minimax.chat/v1',
      apiKey: 'PLACEHOLDER_ENCRYPT_ME',
      isActive: false,
      isDefault: true,
    },
  ],
};
