import { Schema, model, models } from 'mongoose';

const giftcardSchema: Schema = new Schema({
  claimCode: {
    type: String,
    required: true,
    unique: true,
  },
  store: {
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
  currency: {
    type: String,
    enum: ['usd', 'gbp', 'cad'],
    required: true,
  },
  status: {
    type: String,
    enum: ['available', 'on sale', 'sold', 'redeemed', 'disputed'],
    required: true,
  },
  origin: {
    type: String,
    enum: ['surveys', 'offers', 'studies'],
    required: true,
  },
});

const Giftcard = models.Giftcard || model('Giftcard', giftcardSchema);

export default Giftcard;
