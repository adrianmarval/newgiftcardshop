import { OffersFilter, OffersGrid, ServerFilter } from "@/offers/components";
import { findOffers } from "@/offers/actions/offers-actions";

interface Props {
  searchParams: { countryCode: string; storeName: string };
}
const page = async ({ searchParams }: Props) => {
  const offers = await findOffers();

  return (
    <div>
      <OffersFilter />
      {/* <OffersFilter /> */}
      <OffersGrid offers={offers} searchParams={searchParams} />
    </div>
  );
};

export default page;
