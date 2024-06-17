import { headers } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import currencyFormat from 'currency.js';
import { NavigationHandler, UserRateAvatar } from '@/components/common';
import { GiftcardOffer } from '@/interfaces/giftcard-interface';

interface Props {
  offer: GiftcardOffer;
}

const flags = {
  us: '🇺🇸 United States',
  ca: '🇨🇦 Canada',
  uk: '🇬🇧 United Kingdom',
};

const currencies = {
  usd: (value: number) => currencyFormat(value).format({ precision: 0, symbol: '$' }),
  cad: (value: number) => currencyFormat(value).format({ precision: 0, symbol: '$' }),
  gbp: (value: number) => currencyFormat(value).format({ precision: 0, symbol: '£' }),
};

export const GiftcardItem = ({ offer }: Props) => {
  const { brand, country, amount, currency, _id, seller } = offer;
  const currentPath: string | null = headers().get('x-current-path');
  const formattedAmount = currencies[currency](amount);

  return (
    <article className="relative rounded-lg bg-white shadow-md hover:scale-[102%]">
      <div className="absolute -right-0 top-0 z-10 rounded-md bg-blue-100 p-1 text-xs font-extralight shadow-md">
        <span>15% OFF🔥</span>
      </div>

      <div className="mb-2 mt-2 px-1">
        <UserRateAvatar username={seller} />
      </div>
      <Link
        href={`/dashboard/shop/giftcard/details?country=${country}&brand=${brand}&offerId=${_id}&previousPath=${encodeURIComponent(currentPath || '/')}`}
      >
        <Image src={`/${brand}card.webp`} alt={`${brand}Card`} className="rounded-t-lg" width={1428} height={959} priority />
      </Link>

      <div className="flex items-center p-1 text-xs font-black md:text-sm">
        <p className="tetx-2xl">{flags[country]}</p>
      </div>
      <hr />
      <p className="h-9 p-1 text-sm font-thin leading-4">
        {formattedAmount.toString()} {brand.toUpperCase()} Giftcard
      </p>
      <p className="ml-1 text-xs">Precio: {currencyFormat(amount * 0.8).format()} (USDT)</p>

      <div className="mt-2">
        <Link
          href={`/dashboard/shop/giftcard/details?country=${country}&brand=${brand}&offerId=${_id}&previousPath=${encodeURIComponent(currentPath || '/')}`}
        >
          <button
            value={_id}
            data-variant="flat"
            className="font-body hover:shadow-cart block w-full cursor-pointer rounded-xl border-0 border-transparent bg-black p-2 text-center text-xs font-semibold leading-3 text-white placeholder-white transition duration-75 ease-in-out hover:scale-105 hover:bg-gray-600 hover:text-white focus:outline-none focus-visible:outline-none"
            type="submit"
          >
            Comprar
          </button>
        </Link>
      </div>
      <NavigationHandler />
    </article>
  );
};
