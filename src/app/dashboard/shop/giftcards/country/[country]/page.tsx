import Link from "next/link";
import React from "react";

interface Props {
  searchParams: { storeName: string; countryCode: string; offerId: string };
}

const page = ({ searchParams }: Props) => {
  return (
    <div className="animate__animated animate__fadeIn mx-5 mt-6 flex flex-col items-center justify-center text-6xl">
      Publicacion #{searchParams.offerId}
      <Link
        href={`/dashboard/buy?countryCode=${searchParams.countryCode}&storeName=${searchParams.storeName}`}
      >
        <button className="mt-6 flex items-center justify-center rounded-md bg-black p-2 text-lg text-white">
          Volver al listado
        </button>
      </Link>
    </div>
  );
};

export default page;
