import { OffersGrid, FilterBar } from "@/offers/components";

const page = async () => {
  return (
    <div>
      <FilterBar />
      <OffersGrid />
    </div>
  );
};

export default page;
