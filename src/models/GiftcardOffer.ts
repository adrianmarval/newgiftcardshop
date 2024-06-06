import { Schema, model, models } from 'mongoose';
import { CountryCode, Currency, StoreName, OfferStatus, AvailableCard, type GiftcardOffer } from '@/types/giftcards';

// Esquema para AvailableCard
const AvailableCardSchema = new Schema<AvailableCard>(
  {
    cardTitle: { type: String, required: true },
    cardValue: { type: Number, required: true },
    units: { type: Number, required: true },
  },
  { _id: false },
);

// Esquema para GiftcardOffer
const GiftcardOfferSchema = new Schema({
  date: { type: Date, required: true },
  offerId: { type: String, required: true, unique: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  totalAmount: { type: Number, required: true },
  storeName: { type: String, enum: Object.values(StoreName), required: true },
  countryCode: { type: String, enum: Object.values(CountryCode), required: true },
  currency: { type: String, enum: Object.values(Currency), required: true },
  availableCards: { type: [AvailableCardSchema], required: true },
  status: { type: String, enum: Object.values(OfferStatus), default: OfferStatus.AVAILABLE },
});

// Modelo de Mongoose
const GiftcardOffer = models.GiftcardOffer || model('GiftcardOffer', GiftcardOfferSchema);

export default GiftcardOffer;
