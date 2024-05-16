import { OffersGrid } from "../../../offers/components/OffersGrid";
import { getOffers } from "@/offers/actions/offers-actions";

const page = async () => {
  const offers = await getOffers();
  return (
    <div className="flex items-center justify-center px-4 pt-6">
      <OffersGrid offers={offers} />
    </div>
  );
};

export default page;
