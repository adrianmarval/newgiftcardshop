'use client';
import Image from 'next/image';
import { useState } from 'react';
import { IoTrashOutline, IoChevronDownOutline } from 'react-icons/io5';

export const GiftCardItem = () => {
  const [expanded, setExpanded] = useState(false);
  const retailer = 'amazon';
  const amount = 10;
  const quantity = 10;
  const subtotal = amount * quantity;

  const giftCards = Array.from({ length: quantity }, (_, i) => ({
    id: i + 1,
    code: `${retailer.toUpperCase().slice(0, 3)}${Math.random().toString(36).slice(2, 8)}`,
  }));

  const handleRemove = (id: number) => console.log(`Remover tarjeta ${id}`);

  return (
    <div className="relative mb-5 cursor-pointer items-center text-sm">
      <div className="flex justify-between" onClick={() => setExpanded(!expanded)}>
        <Image src={`/${retailer}.webp`} width={70} height={70} alt={`${retailer} Giftcard`} className="mr-5 rounded border p-2" />
        <div className="flex w-full justify-between">
          <div className="leading-tight">
            <p className="font-semibold">{`${retailer.charAt(0).toUpperCase() + retailer.slice(1)} GiftCard`}</p>
            <p> Monto: ${amount} </p>
            <div className="flex items-center gap-2">
              <p> Cantidad: <span className='font-semibold'>{quantity} </span></p>
              <IoChevronDownOutline className={`-m-1.5 transition-transform ${expanded ? 'rotate-180' : ''}`} size={20} />
              <p className="cursor-pointer rounded-lg underline hover:scale-105 ml-2">Remover</p>
            </div>
          </div>

          <p className="text-sm font-semibold leading-tight">${subtotal}</p>
        </div>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-screen' : 'max-h-0'}`}>
        <div className="mx-16 rounded-lg bg-white shadow-lg">
          {giftCards.map((card) => (
            <div key={card.id} className="flex items-center justify-between border-b p-4">
              <div>
                <span className="mr-2 font-mono text-sm">{card.code}</span>
              </div>
              <button onClick={() => handleRemove(card.id)} className="rounded-lg p-2 text-xs text-red-500">
                <IoTrashOutline size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
