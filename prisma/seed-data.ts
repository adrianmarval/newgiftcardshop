import { encrypt, hashCode } from '@/lib/encryption';
import { Prisma } from '../src/generated/prisma/client';
import { hashPassword } from 'better-auth/crypto';

interface SeedData {
  userData: Prisma.UserCreateInput[];
  countryData: Prisma.CountryCreateInput[];
  brandData: Prisma.BrandCreateInput[];
  brandCountryData: Prisma.BrandCountryCreateInput[];
  platformSettingData: Prisma.PlatformSettingsCreateInput[];
}

export const seedData: SeedData = {
  userData: [
    {
      name: 'Adrian Marval',
      email: 'adrian.marval@gmail.com',
      emailVerified: true,
      isActive: true,
      role: 'ADMIN',
      paymentMethod: {
        create: {
          address: 'ssdgsdgsdgsdgsdg',
          coin: 'USDT',
          network: 'AVAXC',
        },
      },
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
      sellRate: 0.75,
      paymentMethod: {
        create: {
          address: '118s4g684sd68g48s64dg68sdg',
          coin: 'USDT',
          network: 'AVAXC',
        },
      },
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
      email: 'dunia@prisma.io',
      emailVerified: true,
      isActive: true,
      buyRate: 0.85,
      role: 'BUYER',
      paymentMethod: {
        create: {
          address: '118s4g684sd68g48s64dg68sdg',
          coin: 'USDT',
          network: 'AVAXC',
        },
      },
      accounts: {
        create: {
          accountId: 'buyer-account-provider-id',
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
    { brand: { connect: { slug: 'amazon' } }, country: { connect: { code: 'US' } }, minAmount: 5, maxAmount: 500 },
    { brand: { connect: { slug: 'amazon' } }, country: { connect: { code: 'CA' } }, minAmount: 5, maxAmount: 200 },
    { brand: { connect: { slug: 'amazon' } }, country: { connect: { code: 'GB' } }, minAmount: 5, maxAmount: 500 },
    { brand: { connect: { slug: 'apple' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 1000 },
    { brand: { connect: { slug: 'apple' } }, country: { connect: { code: 'CA' } } },
    { brand: { connect: { slug: 'apple' } }, country: { connect: { code: 'GB' } } },
    { brand: { connect: { slug: 'best-buy' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 500 },
    { brand: { connect: { slug: 'best-buy' } }, country: { connect: { code: 'CA' } }, minAmount: 10, maxAmount: 500 },
    { brand: { connect: { slug: 'gamestop' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 200 },
    { brand: { connect: { slug: 'gamestop' } }, country: { connect: { code: 'CA' } }, minAmount: 10, maxAmount: 200 },
    { brand: { connect: { slug: 'google-play' } }, country: { connect: { code: 'US' } } },
    { brand: { connect: { slug: 'google-play' } }, country: { connect: { code: 'CA' } } },
    { brand: { connect: { slug: 'google-play' } }, country: { connect: { code: 'GB' } } },
    { brand: { connect: { slug: 'home-depot' } }, country: { connect: { code: 'US' } }, minAmount: 25, maxAmount: 500 },
    { brand: { connect: { slug: 'home-depot' } }, country: { connect: { code: 'CA' } }, minAmount: 25, maxAmount: 500 },
    { brand: { connect: { slug: 'macys' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 500 },
    { brand: { connect: { slug: 'nike' } }, country: { connect: { code: 'US' } }, minAmount: 5, maxAmount: 500 },
    { brand: { connect: { slug: 'nike' } }, country: { connect: { code: 'CA' } } },
    { brand: { connect: { slug: 'nike' } }, country: { connect: { code: 'GB' } } },
    { brand: { connect: { slug: 'sephora' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 500 },
    { brand: { connect: { slug: 'sephora' } }, country: { connect: { code: 'CA' } }, minAmount: 10, maxAmount: 500 },
    { brand: { connect: { slug: 'starbucks' } }, country: { connect: { code: 'US' } }, minAmount: 5, maxAmount: 200 },
    { brand: { connect: { slug: 'starbucks' } }, country: { connect: { code: 'CA' } }, minAmount: 5, maxAmount: 200 },
    { brand: { connect: { slug: 'target' } }, country: { connect: { code: 'US' } }, minAmount: 10, maxAmount: 500 },
    { brand: { connect: { slug: 'target' } }, country: { connect: { code: 'CA' } }, minAmount: 10, maxAmount: 500 },
    { brand: { connect: { slug: 'walmart' } }, country: { connect: { code: 'US' } }, minAmount: 5, maxAmount: 500 },
    { brand: { connect: { slug: 'walmart' } }, country: { connect: { code: 'CA' } }, minAmount: 5, maxAmount: 500 },
  ],
  platformSettingData: [
    {
      balance: 0,
      key: 'platformBalance',
      description: 'Saldo disponible en la plataforma',
      value: '0',
    },
    {
      key: 'binance_pay_id',
      value: '57038454',
      description: 'ID de pago de Binance',
    },
  ],
};
