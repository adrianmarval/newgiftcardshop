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
  const [brands, countries, sellRate] = await Promise.all([getActiveBrands(), getActiveCountries(), getSellerRate()]);

  if (!sellRate.data) throw new Error("Failed to get seller rate");
  if (!brands.data) throw new Error("Failed to get brands");
  if (!countries.data) throw new Error("Failed to get countries");

  return <SellBatchManager brands={brands.data} countries={countries.data} sellRate={sellRate.data} />;
}
