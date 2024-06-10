'use client';

import { useRouter } from 'next/navigation';
import { IoRefreshOutline } from 'react-icons/io5';

export const UpdateOffersButton = () => {
  const router = useRouter();

  return (
    <button onClick={router.refresh} className="mb-1 flex items-center justify-center rounded-lg p-1 text-lg">
      <IoRefreshOutline size={20} />
      Actualizar
    </button>
  );
};
