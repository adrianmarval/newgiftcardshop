import { OffersGrid } from "@/offers/components";

interface Props {
  params: { brand: string };
  searchParams: { page?: string };
}

const page = async ({ params }: Props) => {
  const { brand } = params;

  return (
    <div>
      <OffersGrid />
    </div>
  );
};

export default page;
