import { BuyGiftcardManager } from "@/components/buy/buy-giftcard-manager";
import { getActiveBrands, getActiveCountries } from "@/actions";
import { getOrderById } from "@/actions/order-actions";
import type { BuyerOrder } from "@/types";

export default async function BrowseCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const [brands, countries, params] = await Promise.all([
    getActiveBrands(),
    getActiveCountries(),
    searchParams,
  ]);

  if (!brands.data) throw new Error("Ocurrio un error al cargar las marcas");
  if (!countries.data) throw new Error("Ocurrio un error al cargar los paises");

  let resumeOrder: BuyerOrder | null = null;
  if (params.orderId) {
    const result = await getOrderById({ orderId: params.orderId });
    resumeOrder = (result?.data as BuyerOrder) ?? null;
  }

  return (
    <BuyGiftcardManager
      brands={brands.data}
      countries={countries.data}
      resumeOrder={resumeOrder}
    />
  );
}
