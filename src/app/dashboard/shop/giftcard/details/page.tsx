import { cookies } from 'next/headers';
import Link from 'next/link';
import React from 'react';

interface Props {
  searchParams: { brand: string; country: string; offerId: string };
}

const page = ({ searchParams }: Props) => {
  const cookieStore = cookies();
  const previousUrl = cookieStore.get('previousUrl')?.value || '/'; // Leer de cookies
  return (
    <div className="animate__animated animate__fadeIn mx-5 mt-6 flex flex-col items-center justify-center text-6xl">
      Publicacion #{searchParams.offerId}
      <Link href={previousUrl}>
        <button className="mt-6 flex items-center justify-center rounded-md bg-black p-2 text-lg text-white">Volver</button>
      </Link>
    </div>
  );
};

export default page;
