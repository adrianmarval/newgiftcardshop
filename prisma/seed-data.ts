import { Prisma } from "../src/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";

interface SeedData {
  userData: Prisma.UserCreateInput[];
  countryData: Prisma.CountryCreateInput[];
}

export const seedData: SeedData = {
  userData: [
    {
      name: "Adrian Marval",
      email: "adrian.marval@gmail.com",
      emailVerified: true,
      role: ["ADMIN"],
      paymentMethod: {
        create: {
          address: "ssdgsdgsdgsdgsdg",
          coin: "USDT",
          network: "AVAXC",
        },
      },
      accounts: {
        create: {
          accountId: "admin-account-provider-id",
          providerId: "credential",
          password: await hashPassword("Adri891."),
        },
      },
    },
    {
      name: "Solmaira Maza",
      email: "solmaira.maza@gmail.com",
      emailVerified: true,
      role: ["SELLER"],
      paymentMethod: {
        create: {
          address: "118s4g684sd68g48s64dg68sdg",
          coin: "USDT",
          network: "AVAXC",
        },
      },
      giftcardBatches: {
        create: [
          {
            giftcards: {
              create: [
                {
                  brand: "AMAZON",
                  claimCode: "AMZ-BATCH1-001",
                  amount: 100.0,
                  price: 95.0,
                  status: "UNUSED",
                },
                {
                  brand: "AMAZON",
                  claimCode: "AMZ-BATCH1-002",
                  amount: 50.0,
                  price: 47.5,
                  status: "UNUSED",
                },
                {
                  brand: "AMAZON",
                  claimCode: "AMZ-BATCH1-003",
                  amount: 25.0,
                  price: 23.75,
                  status: "UNUSED",
                },
              ],
            },
          },
          {
            giftcards: {
              create: [
                {
                  brand: "APPLE_ITUNES",
                  claimCode: "APL-BATCH2-001",
                  amount: 100.0,
                  price: 90.0,
                  status: "UNUSED",
                },
                {
                  brand: "APPLE_ITUNES",
                  claimCode: "APL-BATCH2-002",
                  amount: 100.0,
                  price: 90.0,
                  status: "UNUSED",
                },
                {
                  brand: "APPLE_ITUNES",
                  claimCode: "APL-BATCH2-003",
                  amount: 50.0,
                  price: 45.0,
                  status: "UNUSED",
                },
              ],
            },
          },
          {
            giftcards: {
              create: [
                {
                  brand: "RAZER_GOLD",
                  claimCode: "RZR-BATCH3-001",
                  amount: 50.0,
                  price: 48.0,
                  status: "UNUSED",
                },
                {
                  brand: "RAZER_GOLD",
                  claimCode: "RZR-BATCH3-002",
                  amount: 20.0,
                  price: 19.2,
                  status: "UNUSED",
                },
                {
                  brand: "RAZER_GOLD",
                  claimCode: "RZR-BATCH3-003",
                  amount: 10.0,
                  price: 9.6,
                  status: "UNUSED",
                },
              ],
            },
          },
        ],
      },
      accounts: {
        create: {
          accountId: "seller-account-provider-id",
          providerId: "credential",
          password: await hashPassword("Adri891."),
        },
      },
    },
    {
      name: "Dunia Marcano",
      email: "dunia@prisma.io",
      emailVerified: true,
      role: ["BUYER"],
      paymentMethod: {
        create: {
          address: "118s4g684sd68g48s64dg68sdg",
          coin: "USDT",
          network: "AVAXC",
        },
      },
      accounts: {
        create: {
          accountId: "buyer-account-provider-id",
          providerId: "credential",
          password: await hashPassword("Adri891."),
        },
      },
    },
  ],
  countryData: [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "GB", name: "United Kingdom" },
  ],
};
