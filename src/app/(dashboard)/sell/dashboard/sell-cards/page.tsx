import { SellBatchManager } from "@/components/sell/sell-batch-manager";
import { getActiveBrands, getActiveCountries } from "@/actions/giftcard-actions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell Gift Cards | Solmaira Cards",
  description: "Create a new batch of gift cards to sell on Solmaira",
};

export default async function SellBatchPage() {
  const [brands, countries] = await Promise.all([
    getActiveBrands(),
    getActiveCountries(),
  ]);

  return (
    <SellBatchManager
      brands={brands as { id: string; slug: string; name: string; icon: string; image: string | null }[]}
      countries={countries as { id: string; name: string; code: string }[]}
    />
  );
}
