import Link from "next/link";
import React from "react";

interface Props {
  params: { storeName: string; countryCode: string; offerId: string };
  searchParams: { offerId: string };
}

const page = ({ searchParams }: Props) => {
  return (
    <div className="animate__animated animate__fadeIn mx-5 mt-6 flex flex-col items-center justify-center text-6xl">
      Publicacion #{searchParams.offerId}
      <Link href={"/dashboard/buy"}>
        <button className="mt-6 flex items-center justify-center rounded-md bg-black p-2 text-lg text-white">
          Ver Ofertas
        </button>
      </Link>
    </div>
  );
};

export default page;
