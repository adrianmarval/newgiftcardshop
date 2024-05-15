import Image from "next/image";
import Link from "next/link";
import { ProfileDropdown } from "./ProfileDropDown";
import { NavbarButton } from "./NavbarButton";
import { NotificationsBadge } from "./NotificationsBadge";

const obtenerNoticias = async (): Promise<string[]> => {
  return [
    "Bienvenido al mejor mercado de tarjetas de regalo de habla hispana. Aqui podras comprar y vender tarjetas de regalo de tiendas como: Amazon, Apple, Wallmart, Target y mas... y cambiarlas por usdt, btc, eth o cualquier otra criptomoneda, intercambiar tarjetas de regalo nunca fue tan facil y seguro!.",
  ];
  // try {
  //   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/news`, {
  //     next: {
  //       revalidate: 60,
  //     },
  //   });
  //   const data: string[] = await res.json();
  //   return data;
  // } catch (error) {
  //   return [
  //     "Bienvenido al mejor mercado de tarjetas de regalo de habla hispana. Aqui podras comprar y vender tarjetas de regalo de tiendas como: Amazon, Apple, Wallmart, Target y mas... y cambiarlas por usdt, btc, eth o cualquier otra criptomoneda, intercambiar tarjetas de regalo nunca fue tan facil y seguro!.",
  //   ];
  // }
};

export const Navbar = async () => {
  const news = await obtenerNoticias();

  return (
    <nav className="fixed z-30 w-full border-b border-gray-200 bg-white">
      <div className="">
        <div className="flex items-center justify-between p-1">
          <div className="flex items-center justify-center">
            <NavbarButton />
            <Link
              href="/"
              className="flex w-64 items-center justify-center text-xl font-bold"
            >
              <Image
                src={"/logo.svg"}
                alt={"Logo de la tienda"}
                width={92 * 2.5}
                height={36 * 2.5}
                priority
              />
            </Link>
          </div>
          <div className="relative mr-5 hidden w-full items-center overflow-hidden md:flex">
            <span className="mx-3 text-base font-normal">News:</span>
            <div className="marquee-container rounded-3xl">
              <div className="marquee-text flex items-center text-base font-normal capitalize">
                {news.map((text) => `⚠️ Noticia: ${text} `)}
              </div>
            </div>
          </div>
          <div className="mr-6 flex items-center">
            <NotificationsBadge />
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </nav>
  );
};
