import { Types } from 'mongoose'; // Si estás usando Mongoose

// Enums para los tipos existentes
export enum CountryCode {
  CA = 'ca',
  UK = 'uk',
  US = 'us',
}

export enum Currency {
  CAD = 'cad',
  GBP = 'gbp',
  USD = 'usd',
}

export enum StoreName {
  AMAZON = 'amazon',
  APPLE = 'apple',
}

export enum OfferStatus {
  AVAILABLE = 'disponible',
  SOLD = 'vendida',
  DISPUTED = 'disputada',
}

// Interfaz para AvailableCard
export interface AvailableCard {
  cardTitle: string; // Título descriptivo de la tarjeta (ej: "Amazon $25 Gift Card")
  cardValue: number; // Valor de la tarjeta en la moneda especificada
  units: number; // Cantidad de unidades disponibles de esta tarjeta
}

// Interfaz mejorada para GiftcardOffer
export interface GiftcardOffer {
  _id?: Types.ObjectId; // ID de la oferta en la base de datos (opcional si no usas Mongoose)
  date: Date; // Fecha de la oferta
  offerId: string; // ID único de la oferta
  seller: string; // Referencia al usuario vendedor (ObjectId de Mongoose)
  totalAmount: number; // Valor total de la oferta en la moneda especificada
  storeName: StoreName; // Nombre de la tienda (Amazon o Apple)
  countryCode: CountryCode; // Código de país del vendedor
  currency: Currency; // Moneda de la oferta (CAD, GBP, USD)
  availableCards: AvailableCard[]; // Array de tarjetas disponibles
  status?: OfferStatus; // Estado de la oferta (opcional)
}
