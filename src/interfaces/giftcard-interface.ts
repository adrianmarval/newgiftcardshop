export interface AvailableCard {
  cardTitle: string;
  cardValue: number;
  units: number;
}

export interface GiftcardOffer {
  date: Date;
  offerId: string;
  seller: string;
  totalAmount: number;
  brand: Brand;
  country: Country;
  currency: Currency;
  availableCards: AvailableCard[];
}

export type Categories = 'country' | 'brand';

export type Brand = 'amazon' | 'apple';

export type Country = 'ca' | 'uk' | 'us';

export type Currency = 'cad' | 'gbp' | 'usd';
