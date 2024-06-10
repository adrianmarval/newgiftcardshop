export interface Giftcard {
  _id: string;
  brand: Brand;
  country: Country;
  origin: Origin;
  amount: string;
  claimCode: string;
}

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

export type Brand = 'amazon' | 'apple' | 'wallmart';

export type Country = 'ca' | 'uk' | 'us';

export type Currency = 'cad' | 'gbp' | 'usd';

export type Origin = 'surveys' | 'offers' | 'studies';
