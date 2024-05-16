"use server";
import { GiftcardOrder } from "../interfaces/giftcard-order";

const orders: GiftcardOrder[] = [
  {
    date: new Date(),
    orderId: "Y1Z2A3B4A5",
    username: "mark_wilson",
    totalAmount: 185,
    storeName: "amazon",
    countryCode: "ca",
    currency: "CAD",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD 5 CAD", cardValue: 5, units: 9 },
      { cardTitle: "AMAZON GIFTCARD 10 CAD", cardValue: 10, units: 3 },
      { cardTitle: "AMAZON GIFTCARD 15 CAD", cardValue: 15, units: 4 },
      { cardTitle: "AMAZON GIFTCARD 25 CAD", cardValue: 25, units: 2 },
    ],
  },
  {
    date: new Date(),
    orderId: "X2Y3Z4A5B6",
    username: "jane_doe",
    totalAmount: 120,
    storeName: "apple",
    countryCode: "us",
    currency: "USD",
    availableCards: [
      { cardTitle: "APPLE GIFTCARD $10", cardValue: 10, units: 6 },
      { cardTitle: "APPLE GIFTCARD $25", cardValue: 25, units: 3 },
    ],
  },
  {
    date: new Date(),
    orderId: "W3X4Y5Z6C7",
    username: "john_smith",
    totalAmount: 200,
    storeName: "amazon",
    countryCode: "uk",
    currency: "GBP",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD £10", cardValue: 10, units: 10 },
      { cardTitle: "AMAZON GIFTCARD £20", cardValue: 20, units: 5 },
    ],
  },
  {
    date: new Date(),
    orderId: "V4W5X6Y7D8",
    username: "sarah_lee",
    totalAmount: 75,
    storeName: "amazon",
    countryCode: "ca",
    currency: "CAD",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD 5 CAD", cardValue: 5, units: 5 },
      { cardTitle: "AMAZON GIFTCARD 10 CAD", cardValue: 10, units: 3 },
      { cardTitle: "AMAZON GIFTCARD 15 CAD", cardValue: 15, units: 2 },
    ],
  },
  {
    date: new Date(),
    orderId: "U5V6W7X8E9",
    username: "michael_brown",
    totalAmount: 150,
    storeName: "apple",
    countryCode: "us",
    currency: "USD",
    availableCards: [
      { cardTitle: "APPLE GIFTCARD $25", cardValue: 25, units: 6 },
    ],
  },
  {
    date: new Date(),
    orderId: "T6U7V8W9F0",
    username: "emily_taylor",
    totalAmount: 165,
    storeName: "amazon",
    countryCode: "uk",
    currency: "GBP",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD £10", cardValue: 10, units: 5 },
      { cardTitle: "AMAZON GIFTCARD £20", cardValue: 20, units: 4 },
      { cardTitle: "AMAZON GIFTCARD £25", cardValue: 25, units: 3 },
    ],
  },
  {
    date: new Date(),
    orderId: "S7T8U9V0G1",
    username: "david_walker",
    totalAmount: 90,
    storeName: "amazon",
    countryCode: "ca",
    currency: "CAD",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD 5 CAD", cardValue: 5, units: 6 },
      { cardTitle: "AMAZON GIFTCARD 10 CAD", cardValue: 10, units: 3 },
      { cardTitle: "AMAZON GIFTCARD 15 CAD", cardValue: 15, units: 2 },
    ],
  },
  {
    date: new Date(),
    orderId: "R8S9T0U1H2",
    username: "jessica_martin",
    totalAmount: 100,
    storeName: "apple",
    countryCode: "us",
    currency: "USD",
    availableCards: [
      { cardTitle: "APPLE GIFTCARD $25", cardValue: 25, units: 4 },
    ],
  },
  {
    date: new Date(),
    orderId: "Q9R0S1T2I3",
    username: "robert_lee",
    totalAmount: 150,
    storeName: "amazon",
    countryCode: "uk",
    currency: "GBP",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD £10", cardValue: 10, units: 6 },
      { cardTitle: "AMAZON GIFTCARD £20", cardValue: 20, units: 3 },
    ],
  },
  {
    date: new Date(),
    orderId: "P0Q1R2S3J4",
    username: "emma_brown",
    totalAmount: 75,
    storeName: "amazon",
    countryCode: "ca",
    currency: "CAD",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD 5 CAD", cardValue: 5, units: 3 },
      { cardTitle: "AMAZON GIFTCARD 10 CAD", cardValue: 10, units: 3 },
      { cardTitle: "AMAZON GIFTCARD 15 CAD", cardValue: 15, units: 2 },
    ],
  },
  {
    date: new Date(),
    orderId: "O1P2Q3R4K5",
    username: "sophia_wilson",
    totalAmount: 125,
    storeName: "apple",
    countryCode: "us",
    currency: "USD",
    availableCards: [
      { cardTitle: "APPLE GIFTCARD $25", cardValue: 25, units: 5 },
    ],
  },
  {
    date: new Date(),
    orderId: "N2O3P4Q5M6",
    username: "william_smith",
    totalAmount: 210,
    storeName: "amazon",
    countryCode: "uk",
    currency: "GBP",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD £10", cardValue: 10, units: 6 },
      { cardTitle: "AMAZON GIFTCARD £20", cardValue: 20, units: 5 },
      { cardTitle: "AMAZON GIFTCARD £25", cardValue: 25, units: 4 },
    ],
  },
  {
    date: new Date(),
    orderId: "M3N4O5P6N7",
    username: "olivia_brown",
    totalAmount: 105,
    storeName: "amazon",
    countryCode: "ca",
    currency: "CAD",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD 5 CAD", cardValue: 5, units: 3 },
      { cardTitle: "AMAZON GIFTCARD 10 CAD", cardValue: 10, units: 6 },
      { cardTitle: "AMAZON GIFTCARD 15 CAD", cardValue: 15, units: 3 },
    ],
  },
  {
    date: new Date(),
    orderId: "L4M5N6O7O8",
    username: "jacob_taylor",
    totalAmount: 150,
    storeName: "apple",
    countryCode: "us",
    currency: "USD",
    availableCards: [
      { cardTitle: "APPLE GIFTCARD $25", cardValue: 25, units: 6 },
    ],
  },
  {
    date: new Date(),
    orderId: "K5L6M7N8P9",
    username: "isabella_walker",
    totalAmount: 275,
    storeName: "amazon",
    countryCode: "uk",
    currency: "GBP",
    availableCards: [
      { cardTitle: "AMAZON GIFTCARD £10", cardValue: 10, units: 5 },
      { cardTitle: "AMAZON GIFTCARD £20", cardValue: 20, units: 6 },
      { cardTitle: "AMAZON GIFTCARD £25", cardValue: 25, units: 5 },
    ],
  },
];

export const getOrders = async (): Promise<GiftcardOrder[]> => {
  try {
    return orders;
  } catch (error) {
    throw error;
  }
};
