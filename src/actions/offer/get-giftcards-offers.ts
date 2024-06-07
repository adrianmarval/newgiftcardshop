'use server';

import { ParamsFilters } from '@/interfaces/filter-interface';
import { GiftcardOffer } from '@/interfaces/giftcard-interface';

const offers: GiftcardOffer[] = [
  {
    date: new Date(),
    offerId: 'Y1Z2A3B4A5',
    seller: 'mark_wilson',
    totalAmount: 185,
    brand: 'amazon',
    country: 'ca',
    currency: 'cad',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD 5 CAD', cardValue: 5, units: 9 },
      { cardTitle: 'AMAZON GIFTCARD 10 CAD', cardValue: 10, units: 3 },
      { cardTitle: 'AMAZON GIFTCARD 15 CAD', cardValue: 15, units: 4 },
      { cardTitle: 'AMAZON GIFTCARD 25 CAD', cardValue: 25, units: 2 },
    ],
  },
  {
    date: new Date(),
    offerId: 'X2Y3Z4A5B6',
    seller: 'jane_doe',
    totalAmount: 120,
    brand: 'apple',
    country: 'us',
    currency: 'usd',
    availableCards: [
      { cardTitle: 'APPLE GIFTCARD $10', cardValue: 10, units: 6 },
      { cardTitle: 'APPLE GIFTCARD $25', cardValue: 25, units: 3 },
    ],
  },
  {
    date: new Date(),
    offerId: 'W3X4Y5Z6C7',
    seller: 'john_smith',
    totalAmount: 200,
    brand: 'amazon',
    country: 'uk',
    currency: 'gbp',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD £10', cardValue: 10, units: 10 },
      { cardTitle: 'AMAZON GIFTCARD £20', cardValue: 20, units: 5 },
    ],
  },
  {
    date: new Date(),
    offerId: 'V4W5X6Y7D8',
    seller: 'sarah_lee',
    totalAmount: 75,
    brand: 'amazon',
    country: 'ca',
    currency: 'cad',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD 5 CAD', cardValue: 5, units: 5 },
      { cardTitle: 'AMAZON GIFTCARD 10 CAD', cardValue: 10, units: 3 },
      { cardTitle: 'AMAZON GIFTCARD 15 CAD', cardValue: 15, units: 2 },
    ],
  },
  {
    date: new Date(),
    offerId: 'U5V6W7X8E9',
    seller: 'michael_brown',
    totalAmount: 150,
    brand: 'apple',
    country: 'us',
    currency: 'usd',
    availableCards: [{ cardTitle: 'APPLE GIFTCARD $25', cardValue: 25, units: 6 }],
  },
  {
    date: new Date(),
    offerId: 'T6U7V8W9F0',
    seller: 'emily_taylor',
    totalAmount: 165,
    brand: 'amazon',
    country: 'uk',
    currency: 'gbp',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD £10', cardValue: 10, units: 5 },
      { cardTitle: 'AMAZON GIFTCARD £20', cardValue: 20, units: 4 },
      { cardTitle: 'AMAZON GIFTCARD £25', cardValue: 25, units: 3 },
    ],
  },
  {
    date: new Date(),
    offerId: 'S7T8U9V0G1',
    seller: 'david_walker',
    totalAmount: 90,
    brand: 'amazon',
    country: 'ca',
    currency: 'cad',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD 5 CAD', cardValue: 5, units: 6 },
      { cardTitle: 'AMAZON GIFTCARD 10 CAD', cardValue: 10, units: 3 },
      { cardTitle: 'AMAZON GIFTCARD 15 CAD', cardValue: 15, units: 2 },
    ],
  },
  {
    date: new Date(),
    offerId: 'R8S9T0U1H2',
    seller: 'jessica_martin',
    totalAmount: 100,
    brand: 'apple',
    country: 'us',
    currency: 'usd',
    availableCards: [{ cardTitle: 'APPLE GIFTCARD $25', cardValue: 25, units: 4 }],
  },
  {
    date: new Date(),
    offerId: 'Q9R0S1T2I3',
    seller: 'robert_lee',
    totalAmount: 150,
    brand: 'amazon',
    country: 'uk',
    currency: 'gbp',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD £10', cardValue: 10, units: 6 },
      { cardTitle: 'AMAZON GIFTCARD £20', cardValue: 20, units: 3 },
    ],
  },
  {
    date: new Date(),
    offerId: 'P0Q1R2S3J4',
    seller: 'emma_brown',
    totalAmount: 75,
    brand: 'amazon',
    country: 'ca',
    currency: 'cad',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD 5 CAD', cardValue: 5, units: 3 },
      { cardTitle: 'AMAZON GIFTCARD 10 CAD', cardValue: 10, units: 3 },
      { cardTitle: 'AMAZON GIFTCARD 15 CAD', cardValue: 15, units: 2 },
    ],
  },
  {
    date: new Date(),
    offerId: 'O1P2Q3R4K5',
    seller: 'sophia_wilson',
    totalAmount: 125,
    brand: 'apple',
    country: 'us',
    currency: 'usd',
    availableCards: [{ cardTitle: 'APPLE GIFTCARD $25', cardValue: 25, units: 5 }],
  },
  {
    date: new Date(),
    offerId: 'N2O3P4Q5M6',
    seller: 'william_smith',
    totalAmount: 210,
    brand: 'amazon',
    country: 'uk',
    currency: 'gbp',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD £10', cardValue: 10, units: 6 },
      { cardTitle: 'AMAZON GIFTCARD £20', cardValue: 20, units: 5 },
      { cardTitle: 'AMAZON GIFTCARD £25', cardValue: 25, units: 4 },
    ],
  },
  {
    date: new Date(),
    offerId: 'M3N4O5P6N7',
    seller: 'olivia_brown',
    totalAmount: 105,
    brand: 'amazon',
    country: 'ca',
    currency: 'cad',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD 5 CAD', cardValue: 5, units: 3 },
      { cardTitle: 'AMAZON GIFTCARD 10 CAD', cardValue: 10, units: 6 },
      { cardTitle: 'AMAZON GIFTCARD 15 CAD', cardValue: 15, units: 3 },
    ],
  },
  {
    date: new Date(),
    offerId: 'L4M5N6O7O8',
    seller: 'jacob_taylor',
    totalAmount: 150,
    brand: 'apple',
    country: 'us',
    currency: 'usd',
    availableCards: [{ cardTitle: 'APPLE GIFTCARD $25', cardValue: 25, units: 6 }],
  },
  {
    date: new Date(),
    offerId: 'K5L6M7N8P9',
    seller: 'isabella_walker',
    totalAmount: 275,
    brand: 'amazon',
    country: 'uk',
    currency: 'gbp',
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD £10', cardValue: 10, units: 5 },
      { cardTitle: 'AMAZON GIFTCARD £20', cardValue: 20, units: 6 },
      { cardTitle: 'AMAZON GIFTCARD £25', cardValue: 25, units: 5 },
    ],
  },
];

export const getGiftcardOffers = async (filters?: ParamsFilters): Promise<GiftcardOffer[]> => {
  const allOffers: GiftcardOffer[] = offers;
  return applyFilters(allOffers, filters);
};

const applyFilters = (offers: GiftcardOffer[], filters?: ParamsFilters): GiftcardOffer[] => {
  return offers.filter((offer) => {
    if (!filters) {
      return true;
    }

    return Object.entries(filters).every(([filterKey, filterValues]) => {
      if (filterValues === undefined) {
        return true;
      }

      switch (filterKey) {
        case 'country':
          return filterValues.includes(offer.country);
        case 'brand':
          return filterValues.includes(offer.brand);
        default:
          return true;
      }
    });
  });
};
