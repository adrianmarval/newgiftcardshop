import { OffersGrid } from "@/offers/components";
import { findOffers } from "@/offers/actions/offers-actions";

interface Props {
  params: { storeName: string; countryCode: string };
  searchParams: object;
}

const page = async ({ params }: Props) => {
  const { storeName, countryCode } = params;
  const offers = await findOffers({ storeName, countryCode });
  return (
    <div className="flex flex-col">
      <span className="mx-4 mb-6 flex items-center justify-center rounded-lg bg-white p-4 text-2xl font-extralight shadow ">
        {`Se han encontrado ${offers.length} Ofertas Disponibles`}
      </span>
      <OffersGrid offers={offers} />
    </div>
  );
};

export default page;
