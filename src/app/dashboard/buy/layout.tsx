// import { revalidatePath } from "next/cache";

interface Props {
  children: React.ReactNode;
}
const BuyLayout = ({ children }: Props) => {
  // const handleUpdateOffers = async () => {
  //   "use server";

  //   revalidatePath("/dashboard/buy");
  // };

  return (
    <div className="animate__animated animate__fadeIn flex flex-col">
      {/* <div className="mx-4 mb-6 flex items-center justify-center rounded-lg bg-white p-4 text-2xl font-extralight shadow ">
        <form action={handleUpdateOffers}>
          <button
            type="submit"
            className="flex items-center justify-center rounded-md bg-black p-2 text-lg text-white"
          >
            Actualizar Ofertas
          </button>
        </form>
      </div> */}
      {children}
    </div>
  );
};

export default BuyLayout;
