'use client';

import { AddGiftCardForm } from './AddGiftCardForm';
import { Giftcard } from '@/interfaces/giftcard-interface';
import { GiftcardTodoItem } from './GiftCardTodoItem';
import { useGiftcardHandler } from '@/hooks/useGiftcardHandler';
import { IoSearchOutline } from 'react-icons/io5';

interface Props {
  giftcards: Giftcard[];
}

export const GiftcardsTodo = ({ giftcards }: Props) => {
  const { optimisticGiftcards, handleAddGiftcard, handleDeleteGiftcard, handletoggleIsPublished } = useGiftcardHandler(giftcards);

  return (
    <div className="flex flex-col items-center justify-center gap-1 md:flex-row md:items-start md:p-2 2xl:justify-start">
      {/* Add Giftcard Form */}
      <div className="flex items-center justify-center">
        <div className="w-[380px] rounded-lg border p-4 shadow md:h-[500px] md:w-96">
          <h1 className="mb-6 text-xl font-bold">Agregar tarjeta de regalo</h1>
          <AddGiftCardForm handleAddGiftcad={handleAddGiftcard} />
        </div>
      </div>

      {/* Giftcards Todo Box */}
      <div className="w-full rounded-xl px-1">
        {/* Search bar */}
        <div className="mb-2 md:flex md:items-center md:justify-between">
          <h1 className="flex w-full items-center justify-center text-lg font-light text-gray-400">Administrador de Anuncios</h1>
          <div className="relative mt-2 flex items-center md:mt-0">
            <span className="absolute">
              <IoSearchOutline className="mx-3 h-5 w-5 text-gray-400 dark:text-gray-600" />
            </span>
            <input
              type="text"
              placeholder="Search"
              className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-11 pr-5 text-gray-700 placeholder-gray-400/70  md:w-80 rtl:pl-5 rtl:pr-11 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:focus:border-blue-300"
            />
          </div>
        </div>

        {/* Todo list */}
        <ul className="h-[660px] overflow-y-auto">
          {optimisticGiftcards.length === 0 && (
            <p className="flex h-full items-center justify-center text-sm font-extrabold tracking-widest text-slate-600 sm:text-xl">
              No hay anuncios
            </p>
          )}

          {optimisticGiftcards.map((giftcard) => (
            <GiftcardTodoItem
              key={giftcard._id}
              giftcard={giftcard}
              handleDeleteGiftcard={handleDeleteGiftcard}
              handletoggleIsPublished={handletoggleIsPublished}
            />
          ))}
        </ul>
        <div className="mt-2 flex justify-center  divide-x overflow-hidden rounded-lg border bg-white rtl:flex-row-reverse dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
          <button className="bg-gray-100 px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 sm:text-sm dark:bg-gray-800 dark:text-gray-300">
            Todas
          </button>
          <button className="px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-100 sm:text-sm dark:text-gray-300 dark:hover:bg-gray-800">
            Publicadas
          </button>
          <button className="px-5 py-2 text-xs font-medium text-gray-600 transition-colors duration-200 hover:bg-gray-100 sm:text-sm dark:text-gray-300 dark:hover:bg-gray-800">
            Sin publicar
          </button>
        </div>
      </div>
    </div>
  );
};
