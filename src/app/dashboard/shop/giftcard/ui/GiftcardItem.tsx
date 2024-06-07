import { NavigationHandler, UserRateAvatar } from '@/components/common';
import { GiftcardOffer } from '@/interfaces/giftcard-interface';
import { headers } from 'next/headers';

import Image from 'next/image';

import Link from 'next/link';

interface Props {
  offer: GiftcardOffer;
}

const flags = {
  us: '🇺🇸',
  ca: '🇨🇦',
  uk: '🇬🇧',
};

export const GiftcardItem = ({ offer }: Props) => {
  const { brand, country, totalAmount, currency, availableCards, offerId, seller } = offer;
  const currentPath: string | null = headers().get('x-current-path');

  return (
    <article className="rounded-lg bg-white shadow-md hover:scale-[102%]">
      <div className="mb-2 mt-2 px-1">
        <UserRateAvatar username={seller} />
      </div>
      <Link
        href={`/dashboard/shop/giftcard/details?country=${country}&brand=${brand}&offerId=${offerId}&previousPath=${encodeURIComponent(currentPath || '/')}`}
      >
        <Image src={`/${brand}card.webp`} alt={`${brand}Card`} className="rounded-t-lg" width={1428} height={959} priority />
      </Link>

      <div className="flex items-center p-1 text-xs font-black md:text-sm">
        <p className="tetx-2xl mr-1">{flags[country]}</p>
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
        <Link
          href={`/dashboard/shop/giftcard/details?country=${country}&brand=${brand}&offerId=${offerId}&previousPath=${encodeURIComponent(currentPath || '/')}`}
        >
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
      <NavigationHandler />
    </article>
  );
};
