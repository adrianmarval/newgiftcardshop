import { GiftcardOrder } from "@/offers/interfaces/giftcard-order";
import { OrdersGrid } from "../../../offers/components/OrdersGrid";

const getOrders = async (): Promise<GiftcardOrder[]> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`);
    const orders: GiftcardOrder[] = await response.json();
    return orders;
  } catch (error) {
    throw error;
  }
};

const page = async () => {
  const orders = await getOrders();
  return (
    <div className="flex items-center justify-center px-4 pt-6">
      <OrdersGrid orders={orders} />
    </div>
  );
};

export default page;
