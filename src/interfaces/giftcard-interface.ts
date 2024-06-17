export interface Giftcard {
  _id?: string;
  brand: Brand;
  country: Country;
  origin: Origin;
  amount: string;
  claimCode: string;
  status: Status;
}

export interface AvailableCard {
  cardTitle: string;
  cardValue: number;
  units: number;
}

export interface GiftcardOffer {
  _id: string;
  date: Date;
  seller: string;
  amount: number;
  brand: Brand;
  country: Country;
  currency: Currency;
  createdAt: string;
  updatedAt: string;
}

export type Categories = 'country' | 'brand';

export type Brand = 'amazon' | 'apple' | 'wallmart';

export type Country = 'ca' | 'uk' | 'us';

export type Currency = 'cad' | 'gbp' | 'usd';

export type Origin = 'surveys' | 'offers' | 'studies';

export type Status = 'paused' | 'published' | 'in escrow' | 'sold' | 'disputed';
