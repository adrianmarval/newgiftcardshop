import Image from "next/image";
import { GiftcardOffer } from "../interfaces/giftcard-offer";
import { UserRateAvatar } from "./UserRateAvatar";
import Link from "next/link";

interface Props {
  offer: GiftcardOffer;
}

const flags = {
  us: "🇺🇸",
  ca: "🇨🇦",
  uk: "🇬🇧",
};

export const OfferCard = ({ offer }: Props) => {
  const {
    storeName,
    countryCode,
    totalAmount,
    currency,
    availableCards,
    offerId,
    username,
  } = offer;

  return (
    <article className="rounded-lg bg-white shadow-md hover:scale-[102%]">
      <div className="mb-2 mt-2 px-1">
        <UserRateAvatar username={username} />
      </div>
      <Link href={`/dashboard/buy/details?offerId=${offerId}`}>
        <Image
          src={`/${storeName}card.webp`}
          alt={`${storeName}Card`}
          className="rounded-t-lg"
          width={1428}
          height={959}
          priority
        />
      </Link>

      <div className="flex items-center p-1 text-xs font-black md:text-sm">
        <p className="tetx-2xl mr-1">{flags[countryCode]}</p>
        <p>
          Total Amount: {totalAmount} {currency}
        </p>
      </div>

      <div className="mx-1 flex h-12 flex-wrap items-center justify-center rounded-lg border text-sm shadow-sm">
        {availableCards.map((card) => (
          <div className="mr-2 flex items-center" key={card.cardTitle}>
            <p>
              {card.cardValue}
              {currency}
            </p>
            <sup>*{card.units}💳</sup>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Link href={`/dashboard/buy/details?offerId=${offerId}`}>
          <button
            value={offerId}
            data-variant="flat"
            className="font-body hover:shadow-cart block w-full cursor-pointer rounded-xl border-0 border-transparent bg-black p-2 text-center text-xs font-semibold leading-3 text-white placeholder-white transition duration-75 ease-in-out hover:scale-105 hover:bg-gray-600 hover:text-white focus:outline-none focus-visible:outline-none"
            type="submit"
          >
            Ver Oferta
          </button>
        </Link>
      </div>
    </article>
  );
};
