'use client';
import { startTransition, useOptimistic } from 'react';
import { AddGiftCardForm } from './AddGiftCardForm';
import { GiftCardItem } from './GiftCardItem';
import { Giftcard } from '@/interfaces/giftcard-interface';
import { addGiftcard } from '@/actions/giftcard/add-giftcard';
import toast from 'react-hot-toast';
import { deleteGiftcard } from '@/actions/giftcard/delete-giftcad';

interface Props {
  giftcards: Giftcard[];
}

export const GiftcardsTodo = ({ giftcards }: Props) => {
  const [optimisticGiftcards, setOptimisticGiftcards] = useOptimistic<Giftcard[]>(giftcards);

  const handleAddGiftcard = async (newGiftcard: Giftcard) => {
    startTransition(() => {
      setOptimisticGiftcards((prevGiftcards) => [newGiftcard, ...prevGiftcards]);
    });
    const { error, successMessage } = await addGiftcard(newGiftcard);
    error ? toast.error(error, { className: 'text-xl' }) : toast.success(successMessage, { className: 'text-xl' });
  };

  const handleDeleteGiftcard = async (id: string) => {
    try {
      if (!id) return;
      const filteredGiftcards = optimisticGiftcards.filter((giftcard) => giftcard._id !== id);
      startTransition(() => {
        setOptimisticGiftcards(filteredGiftcards);
      });
      await deleteGiftcard(id);
    } catch (error) {}
  };

  return (
    <>
      <h1 className="flex w-full items-center justify-center text-xl font-bold">Agregar tarjeta de regalo</h1>
      <div className="mt-6 flex flex-col items-center justify-center gap-6 md:flex-row md:items-start 2xl:justify-start">
        <div className="w-96 rounded-lg border p-4 shadow md:h-[500px]">
          <h1 className="mb-6 text-xl font-bold">Nueva tarjeta de regalo</h1>
          <AddGiftCardForm handleAddGiftcad={handleAddGiftcard} />
        </div>

        <div className="w-full overflow-auto rounded-xl p-4 md:h-[500px] md:px-12">
          {optimisticGiftcards.map((giftcard) => (
            <GiftCardItem key={giftcard._id} giftcard={giftcard} handleDeleteGiftcard={handleDeleteGiftcard} />
          ))}
        </div>
      </div>
    </>
  );
};
