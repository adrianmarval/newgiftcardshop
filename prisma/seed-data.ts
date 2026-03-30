import { Prisma } from "../src/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";

interface SeedData {
  userData: Prisma.UserCreateInput[];
  countryData: Prisma.CountryCreateInput[];
  brandData: Prisma.BrandCreateInput[];
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
                  brand: { connect: { slug: "amazon" } },
                  claimCode: "AMZ-BATCH1-001",
                  amount: 100.0,
                  price: 95.0,
                  status: "UNUSED",
                  country: { connect: { code: "US" } },
                },
                {
                  brand: { connect: { slug: "amazon" } },
                  claimCode: "AMZ-BATCH1-002",
                  amount: 50.0,
                  price: 47.5,
                  status: "UNUSED",
                  country: { connect: { code: "US" } },
                },
                {
                  brand: { connect: { slug: "amazon" } },
                  claimCode: "AMZ-BATCH1-003",
                  amount: 25.0,
                  price: 23.75,
                  status: "UNUSED",
                  country: { connect: { code: "US" } },
                },
              ],
            },
          },
          {
            giftcards: {
              create: [
                {
                  brand: { connect: { slug: "apple" } },
                  claimCode: "APL-BATCH2-001",
                  amount: 100.0,
                  price: 90.0,
                  status: "UNUSED",
                  country: { connect: { code: "US" } },
                },
                {
                  brand: { connect: { slug: "apple" } },
                  claimCode: "APL-BATCH2-002",
                  amount: 100.0,
                  price: 90.0,
                  status: "UNUSED",
                  country: { connect: { code: "US" } },
                },
                {
                  brand: { connect: { slug: "apple" } },
                  claimCode: "APL-BATCH2-003",
                  amount: 50.0,
                  price: 45.0,
                  status: "UNUSED",
                  country: { connect: { code: "US" } },
                },
              ],
            },
          },
          {
            giftcards: {
              create: [
                {
                  brand: { connect: { slug: "google-play" } },
                  claimCode: "RZR-BATCH3-001",
                  amount: 50.0,
                  price: 48.0,
                  status: "UNUSED",
                  country: { connect: { code: "US" } },
                },
                {
                  brand: { connect: { slug: "google-play" } },
                  claimCode: "RZR-BATCH3-002",
                  amount: 20.0,
                  price: 19.2,
                  status: "UNUSED",
                  country: { connect: { code: "US" } },
                },
                {
                  brand: { connect: { slug: "google-play" } },
                  claimCode: "RZR-BATCH3-003",
                  amount: 10.0,
                  price: 9.6,
                  status: "UNUSED",
                  country: { connect: { code: "US" } },
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
  brandData: [
    { slug: "amazon", name: "Amazon", icon: "📦", image: "/images/amazonlogo.svg" },
    { slug: "apple", name: "Apple", icon: "🍎", image: "/images/applelogo.svg" },
    { slug: "best-buy", name: "Best Buy", icon: "🏷️", image: "/images/bestbuylogo.svg" },
    { slug: "gamestop", name: "GameStop", icon: "🎮", image: "/images/gamestoplogo.svg" },
    { slug: "google-play", name: "Google Play", icon: "🎯", image: "/images/googleplaylogo.svg" },
    { slug: "home-depot", name: "Home Depot", icon: "🛠️", image: "/images/homedepotlogo.svg" },
    { slug: "macys", name: "Macy's", icon: "🏬", image: "/images/macyslogo.svg" },
    { slug: "nike", name: "Nike", icon: "✔️", image: "/images/nikelogo.svg" },
    { slug: "sephora", name: "Sephora", icon: "✨", image: "/images/sephoralogo.svg" },
    { slug: "starbucks", name: "Starbucks", icon: "☕", image: "/images/starbuckslogo.svg" },
    { slug: "target", name: "Target", icon: "🎯", image: "/images/targetlogo.svg" },
    { slug: "walmart", name: "Walmart", icon: "🛒", image: "/images/walmartlogo.svg" },
  ],
};
