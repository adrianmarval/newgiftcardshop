import { startTransition, useOptimistic } from 'react';
import toast from 'react-hot-toast';
import { addGiftcard } from '@/actions/giftcard/add-giftcard';
import { deleteGiftcard } from '@/actions/giftcard/delete-giftcad';
import { toggleIsPublished } from '@/actions/giftcard/update-giftcard';
import { Giftcard } from '@/interfaces/giftcard-interface';

export const useGiftcardHandler = (giftcards: Giftcard[]) => {
  const [optimisticGiftcards, setOptimisticGiftcards] = useOptimistic<Giftcard[]>(giftcards);

  const handleAddGiftcard = async (newGiftcard: Giftcard) => {
    if (!newGiftcard) return;
    startTransition(() => {
      setOptimisticGiftcards((prevGiftcards) => [...prevGiftcards, newGiftcard]);
    });
    const { error } = await addGiftcard(newGiftcard);
    error && toast.error(error, { className: 'text-xl' });
  };

  const handleDeleteGiftcard = async (id: string) => {
    if (!id) return;
    const filteredGiftcards = optimisticGiftcards.filter((giftcard) => giftcard._id !== id);
    startTransition(() => {
      setOptimisticGiftcards(filteredGiftcards);
    });
    const { error } = await deleteGiftcard(id);
    error && toast.error(error, { className: 'text-xl' });
  };

  const handletoggleIsPublished = async (id: string, status: Giftcard['status']) => {
    if (!id || !status) return;
    const updatedGiftcards = optimisticGiftcards.map((giftcard) => (giftcard._id === id ? { ...giftcard, status } : giftcard));
    startTransition(() => {
      setOptimisticGiftcards(updatedGiftcards);
    });
    const { error, successMesage } = await toggleIsPublished(id, status);
    error && toast.error(error, { className: 'text-xl' });
    successMesage && toast.success(successMesage, { className: 'text-xl' });
  };

  return {
    handleAddGiftcard,
    handleDeleteGiftcard,
    handletoggleIsPublished,
    optimisticGiftcards,
  };
};
