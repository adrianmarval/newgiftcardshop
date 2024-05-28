import { Schema, model, models } from "mongoose";
// import bcrypt from "bcrypt";

const giftCardSchema = new Schema({
  code: {
    type: String,
    required: true,
    select: false,
    // set: (code: string) => bcrypt.hashSync(code, 10),
  },
  store: {
    type: String,
    enum: ["Amazon", "Apple", "Walmart"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    enum: ["USD", "EUR", "Otra"],
    required: true,
  },
  status: {
    type: String,
    enum: ["Disponible", "En venta", "Vendida", "Canjeada", "Disputada"],
    default: "Disponible",
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  listingPrice: {
    type: Number,
  },
  salePrice: {
    type: Number,
  },
  purchaseDate: {
    type: Date,
  },
  listedAt: {
    type: Date,
  },
  soldAt: {
    type: Date,
  },
  expirationDate: {
    type: Date,
  },
  notes: {
    type: String,
  },
  images: [
    {
      type: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

giftCardSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Giftcard = models.Giftcard || model("Giftcard", giftCardSchema);

export default Giftcard;
