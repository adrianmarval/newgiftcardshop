'use client';
import { useOptimistic } from 'react';
import { AddGiftCardForm } from './AddGiftCardForm';
import { GiftCardItem } from './GiftCardItem';
import { Giftcard } from '@/interfaces/giftcard-interface';

interface Props {
  giftcards: Giftcard[];
}

export const GiftcardsTodo = ({ giftcards }: Props) => {
  const [optimisticGiftcards, addOptimisticGiftcard] = useOptimistic(giftcards, (state, newGiftcard: Giftcard) => {
    return [...state, newGiftcard];
  });

  return (
    <>
      <h1 className="flex w-full items-center justify-center text-xl font-bold">Agregar tarjeta de regalo</h1>
      <div className="mt-6 flex flex-col items-center justify-center gap-6 md:flex-row md:items-start 2xl:justify-start">
        <div className="w-96 rounded-lg border p-4 shadow md:h-[500px]">
          <h1 className="mb-6 text-xl font-bold">Nueva tarjeta de regalo</h1>
          <AddGiftCardForm addOptimisticGiftcard={addOptimisticGiftcard} />
        </div>

        <div className="w-full overflow-auto rounded-xl p-4 md:h-[500px] md:px-12">
          {optimisticGiftcards.map((giftcard) => (
            <GiftCardItem key={giftcard._id} giftcard={giftcard} />
          ))}
        </div>
      </div>
    </>
  );
};
