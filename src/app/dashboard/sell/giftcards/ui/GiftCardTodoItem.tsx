'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Giftcard } from '@/interfaces/giftcard-interface';

interface Props {
  giftcard: Giftcard;
  handleDeleteGiftcard: (id: string) => void;
  handletoggleIsPublished: (id: string, status: Giftcard['status']) => void;
}

export const GiftcardTodoItem = ({ giftcard, handleDeleteGiftcard, handletoggleIsPublished }: Props) => {
  const { amount, brand, _id, claimCode, status } = giftcard;
  const receiveAmount = parseInt(amount) * 0.95;
  const [active, setActive] = useState(['published', 'in escrow', 'disputed'].includes(status));

  useEffect(() => {
    setActive(['published', 'in escrow', 'disputed'].includes(status));
  }, [status]);

  const handleToggleStatus = () => {
    const newStatus = active ? 'paused' : 'published';
    setActive(!active);
    handletoggleIsPublished(_id!, newStatus);
  };

  return (
    <li className="relative cursor-pointer items-center rounded-md p-1 text-sm hover:bg-gray-100">
      <div className="flex justify-between">
        <Image src={`/${brand}.webp`} width={90} height={90} alt={`${brand} Giftcard`} className="mr-2 rounded border p-2 md:mr-5" />
        <div className="flex w-full justify-between">
          <div className="leading-tight">
            <p className="font-semibold">{`${brand.charAt(0).toUpperCase() + brand.slice(1)} GiftCard (${claimCode.slice(-4)})`}</p>
            <p>
              Valor: <span className="font-semibold">{amount} USD</span>
            </p>
            <p>
              Recibes: <span className="font-semibold">{receiveAmount} USDT</span>
            </p>
            <p> Estatus: {status.charAt(0).toUpperCase() + status.slice(1)} </p>
            <div className="flex items-center gap-3">
              <p onClick={() => window.alert('No implementado')} className="cursor-pointer rounded-lg underline hover:scale-105">
                Ver detalles
              </p>
              <p onClick={() => handleDeleteGiftcard(_id!)} className="cursor-pointer rounded-lg underline hover:scale-105">
                Remover
              </p>
            </div>
          </div>
          <label className="cursor-pointer w-20">
            <div className="flex justify-center">
              <input onChange={handleToggleStatus} type="checkbox" checked={active} className="peer sr-only" />
              <div className="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-turquoise peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none  rtl:peer-checked:after:-translate-x-full dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
            </div>
            <span className="flex justify-center text-sm font-medium text-gray-900 dark:text-gray-300">
              {status !== 'paused' ? 'Publicada' : 'Sin publicar'}
            </span>
          </label>
        </div>
      </div>
    </li>
  );
};
