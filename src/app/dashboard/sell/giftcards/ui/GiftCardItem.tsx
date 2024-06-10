'use client';
import { deleteGiftcard } from '@/actions/giftcard/delete-giftcad';
import { Giftcard } from '@/interfaces/giftcard-interface';
import Image from 'next/image';
import { useState } from 'react';
import { IoTrashOutline, IoChevronDownOutline } from 'react-icons/io5';

interface Props {
  giftcard: Giftcard;
}

export const GiftCardItem = ({ giftcard }: Props) => {
  const [expanded, setExpanded] = useState(false);

  const { amount, brand, _id } = giftcard;

  const giftCards = Array.from({ length: amount }, (_, i) => ({
    id: i + 1,
    code: `${brand.toUpperCase().slice(0, 3)}${Math.random().toString(36).slice(2, 8)}`,
  }));

  const handleRemove = (id: string) => deleteGiftcard(id);

  return (
    <div className="relative mb-5 cursor-pointer items-center text-sm">
      <div className="flex justify-between" onClick={() => setExpanded(!expanded)}>
        <Image src={`/${brand}.webp`} width={70} height={70} alt={`${brand} Giftcard`} className="mr-5 rounded border p-2" />
        <div className="flex w-full justify-between">
          <div className="leading-tight">
            <p className="font-semibold">{`${brand.charAt(0).toUpperCase() + brand.slice(1)} GiftCard`}</p>
            <p> Monto: ${amount} </p>
            <div className="flex items-center gap-2">
              <p>
                {' '}
                Cantidad: <span className="font-semibold">{amount} </span>
              </p>
              <IoChevronDownOutline className={`-m-1.5 transition-transform ${expanded ? 'rotate-180' : ''}`} size={20} />
              <p onClick={() => handleRemove(_id)} className="ml-2 cursor-pointer rounded-lg underline hover:scale-105">
                Remover
              </p>
            </div>
          </div>

          <p className="text-sm font-semibold leading-tight">${amount}</p>
        </div>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-screen' : 'max-h-0'}`}>
        <div className="mx-16 rounded-lg bg-white shadow-lg">
          {giftCards.map((card) => (
            <div key={card.id} className="flex items-center justify-between border-b p-4">
              <div>
                <span className="mr-2 font-mono text-sm">{card.code}</span>
              </div>
              <button onClick={() => handleRemove(_id)} className="rounded-lg p-2 text-xs text-red-500">
                <IoTrashOutline size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
