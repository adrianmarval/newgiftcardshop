import { getGiftcards } from '@/actions/giftcard/get-giftcards';
import { GiftcardsTodo } from './ui/GiftcardsTodo';

const page = async () => {
  const giftcards = await getGiftcards();

  return (
    <div className="animate__animated animate__fadeIn rounded-xl bg-white p-4">
      <GiftcardsTodo giftcards={giftcards} />

      <div className="mx-auto mt-4 h-fit rounded-xl border bg-white px-7 py-2 shadow-xl">
        <h2 className="text-2xl">Resumen</h2>
        <div className="grid grid-cols-2">
          <span>No. Productos</span>
          <span className="text-right">3 artículos</span>
          <span>Subtotal</span>
          <span className="text-right">$ 100</span>
          <span>Comision (15%)</span>
          <span className="text-right">$ 5</span>
          <span className="mt-2 text-2xl">Total:</span>
          <span className="mt-2 text-right text-2xl">$ 95</span>
        </div>
        <div className="mt-2 flex w-full justify-center">
          <button className="font-extraLigth rounded-lg bg-black px-4 py-2 text-sm text-white">Publicar Oferta</button>
        </div>
      </div>
    </div>
  );
};

export default page;
