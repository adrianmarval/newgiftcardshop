import { GiftCardForm, GiftCardItem } from './ui';


const page = () => {
  return (
    <div className="animate__animated animate__fadeIn rounded-xl bg-white p-4">
      <h1 className="flex w-full items-center justify-center text-xl font-bold">Agregar tarjeta de regalo</h1>
      <div className="mt-6 flex flex-col items-center justify-center gap-6 md:flex-row md:items-start 2xl:justify-start">
        <div className="w-96 rounded-lg border p-4 shadow md:h-[500px]">
          <h1 className="mb-6 text-xl font-bold">Nueva tarjeta de regalo</h1>
          <GiftCardForm />
        </div>

        <div className="w-full overflow-auto rounded-xl p-4 md:h-[500px] md:px-12">
          <GiftCardItem />
          <GiftCardItem />
          <GiftCardItem />
          <GiftCardItem />
        </div>
      </div>

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
