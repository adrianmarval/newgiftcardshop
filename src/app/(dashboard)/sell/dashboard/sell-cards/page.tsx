import { SellBatchManager } from "@/components/sell/sell-batch-manager";
import { getActiveBrands } from "@/actions/brand-actions";
import { getActiveCountries } from "@/actions/country-actions";
import { getSellerRate } from "@/actions/seller-actions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sell Gift Cards | Solmaira Cards",
  description: "Create a new batch of gift cards to sell on Solmaira",
};

export default async function SellBatchPage() {
  const [brands, countries, sellRate] = await Promise.all([
    getActiveBrands(),
    getActiveCountries(),
    getSellerRate(),
  ]);

  return <SellBatchManager brands={brands} countries={countries} sellRate={sellRate} />;
}
