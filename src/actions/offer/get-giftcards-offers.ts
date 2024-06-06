'use server';

import { CountryCode, Currency, StoreName } from '@/types';
import { GiftcardOffer } from '@/offers/giftcards/interfaces/offer-interface';

const { AMAZON, APPLE } = StoreName;
const { CA, UK, US } = CountryCode;
const { CAD, GBP, USD } = Currency;

// Definimos los tipos de filtros que se pueden aplicar
type FilterType = 'country' | 'brand';

// Interfaz para representar los filtros aplicados
interface Filters {
  [key: string]: string[] | undefined;
}

const offers: any = [
  {
    date: new Date(),
    offerId: 'Y1Z2A3B4A5',
    seller: 'mark_wilson',
    totalAmount: 185,
    storeName: AMAZON,
    countryCode: CA,
    currency: CAD,
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
    storeName: APPLE,
    countryCode: US,
    currency: USD,
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
    storeName: AMAZON,
    countryCode: UK,
    currency: GBP,
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
    storeName: AMAZON,
    countryCode: CA,
    currency: CAD,
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
    storeName: APPLE,
    countryCode: US,
    currency: USD,
    availableCards: [{ cardTitle: 'APPLE GIFTCARD $25', cardValue: 25, units: 6 }],
  },
  {
    date: new Date(),
    offerId: 'T6U7V8W9F0',
    seller: 'emily_taylor',
    totalAmount: 165,
    storeName: AMAZON,
    countryCode: UK,
    currency: GBP,
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
    storeName: AMAZON,
    countryCode: CA,
    currency: CAD,
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
    storeName: APPLE,
    countryCode: US,
    currency: USD,
    availableCards: [{ cardTitle: 'APPLE GIFTCARD $25', cardValue: 25, units: 4 }],
  },
  {
    date: new Date(),
    offerId: 'Q9R0S1T2I3',
    seller: 'robert_lee',
    totalAmount: 150,
    storeName: AMAZON,
    countryCode: UK,
    currency: GBP,
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
    storeName: AMAZON,
    countryCode: CA,
    currency: CAD,
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
    storeName: APPLE,
    countryCode: US,
    currency: USD,
    availableCards: [{ cardTitle: 'APPLE GIFTCARD $25', cardValue: 25, units: 5 }],
  },
  {
    date: new Date(),
    offerId: 'N2O3P4Q5M6',
    seller: 'william_smith',
    totalAmount: 210,
    storeName: AMAZON,
    countryCode: UK,
    currency: GBP,
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
    storeName: AMAZON,
    countryCode: CA,
    currency: CAD,
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
    storeName: APPLE,
    countryCode: US,
    currency: USD,
    availableCards: [{ cardTitle: 'APPLE GIFTCARD $25', cardValue: 25, units: 6 }],
  },
  {
    date: new Date(),
    offerId: 'K5L6M7N8P9',
    seller: 'isabella_walker',
    totalAmount: 275,
    storeName: AMAZON,
    countryCode: UK,
    currency: GBP,
    availableCards: [
      { cardTitle: 'AMAZON GIFTCARD £10', cardValue: 10, units: 5 },
      { cardTitle: 'AMAZON GIFTCARD £20', cardValue: 20, units: 6 },
      { cardTitle: 'AMAZON GIFTCARD £25', cardValue: 25, units: 5 },
    ],
  },
];

export const getGiftcardOffers = async (filters?: Filters): Promise<GiftcardOffer[]> => {
  const allOffers: GiftcardOffer[] = offers;
  return applyFilters(allOffers, filters);
};

const applyFilters = (offers: GiftcardOffer[], filters?: Filters): GiftcardOffer[] => {
  return offers.filter((offer) => {
    for (const filterKey in filters) {
      const filterValues = filters[filterKey as FilterType];
      if (filterValues === undefined) {
        continue;
      }

      const matchesFilter =
        filterKey === 'country'
          ? filterValues.includes(offer.countryCode)
          : filterKey === 'brand'
            ? filterValues.includes(offer.storeName)
            : false;

      if (!matchesFilter) {
        return false;
      }
    }
    return true;
  });
};
