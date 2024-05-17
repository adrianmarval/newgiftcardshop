import { OffersGrid } from "@/offers/components";
import { findOffers } from "@/offers/actions/offers-actions";

const page = async () => {
  const offers = await findOffers({});
  return (
    <div className="animate__animated animate__fadeIn flex flex-col">
      <OffersGrid offers={offers} />
    </div>
  );
};

export default page;
