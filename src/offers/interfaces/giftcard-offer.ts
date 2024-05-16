export interface GiftcardOffer {
  date: Date;
  orderId: string;
  username: string;
  totalAmount: number;
  storeName: StoreName;
  countryCode: CountryCode;
  currency: Currency;
  availableCards: AvailableCard[];
}

export interface AvailableCard {
  cardTitle: string;
  cardValue: number;
  units: number;
}

export type CountryCode = "ca" | "uk" | "us";

export type Currency = "CAD" | "GBP" | "USD";

export type StoreName = "amazon" | "apple";
