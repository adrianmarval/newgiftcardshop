import { GiftcardOrder } from "../interfaces/giftcard-order";

interface Props {
  orders: GiftcardOrder[];
}

export const OrdersGrid = ({ orders = [] }: Props) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {orders.map((order) => (
        <div key={order.orderId}>{JSON.stringify(order)}</div>
      ))}
    </div>
  );
};
