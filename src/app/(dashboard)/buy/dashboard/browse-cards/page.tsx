import { BuyGiftcardManager } from "@/components/buy/buy-giftcard-manager";
import { getActiveBrands, getActiveCountries } from "@/actions";

export default async function BrowseCardsPage() {
  const [brands, countries] = await Promise.all([getActiveBrands(), getActiveCountries()]);

  if (!brands.data) throw new Error("Ocurrio un error al cargar las marcas");
  if (!countries.data) throw new Error("Ocurio un error al cargar los paises");

  return <BuyGiftcardManager brands={brands.data} countries={countries.data} />;
}
