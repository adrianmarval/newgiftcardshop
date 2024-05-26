import { Footer, Navbar, Sidebar } from "@/components";

import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <Navbar />
      <div className="flex overflow-hidden bg-white pt-16">
        <Sidebar />
        <div className="relative h-full w-full overflow-y-auto bg-gray-50 px-4 pt-6 lg:ml-64">
          <main>
            <div className="animate__animated animate__fadeIn flex items-center justify-center px-4 text-6xl">
              <div className="w-full text-slate-900">
                <div className="flex h-[700px] w-full flex-col items-center justify-center rounded-2xl bg-white">
                  <h1 className="text-9xl font-extrabold tracking-widest text-slate-600">
                    404
                  </h1>
                  <div className="absolute mb-5 rotate-12 rounded bg-turquoise px-4 text-lg text-slate-600">
                    Pais no encontrado
                  </div>
                  <Link href="/dashboard">
                    <button className="rounded-lg bg-turquoise p-2 text-lg font-semibold text-slate-600 hover:scale-110 hover:shadow-lg">
                      Ir al inicio
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
