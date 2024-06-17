import { Schema, model, models } from 'mongoose';

const giftcardSchema: Schema = new Schema(
  {
    claimCode: {
      type: String,
      required: true,
      unique: true,
    },
    brand: {
      type: String,
      enum: ['amazon', 'apple', 'wallmart'],
      required: true,
    },
    country: {
      type: String,
      enum: ['us', 'uk', 'ca'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['paused', 'published', 'in escrow', 'sold', 'disputed'],
      default: 'paused',
    },
    origin: {
      type: String,
      enum: ['surveys', 'offers', 'studies'],
      required: true,
    },
    seller: {
      type: String,
      enum: ['adrian', 'solmaira', 'dunia'],
      default: 'solmaira',
    },
    currency: {
      type: String,
      enum: ['usd', 'cad', 'gbp'],
      default: 'usd',
    },
  },
  { timestamps: true },
);

const Giftcard = models.Giftcard || model('Giftcard', giftcardSchema);

export default Giftcard;
