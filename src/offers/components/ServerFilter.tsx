// import { ReactSelectFilter } from "@/types";
// import { redirect } from "next/navigation";
// import { cookies } from "next/headers";
// import clsx from "clsx";

// // Definición de los filtros disponibles
// const filterOptions: ReactSelectFilter[] = [
//   { value: "amazon", label: "Amazon", type: "storeName" },
//   { value: "apple", label: "Apple", type: "storeName" },
//   { value: "us", label: "US 🇺🇸", type: "countryCode" },
//   { value: "ca", label: "CA 🇨🇦", type: "countryCode" },
//   { value: "uk", label: "UK 🇬🇧", type: "countryCode" },
// ];

// export const ServerFilter = () => {
//   const countryCode = cookies().get("countryCode")?.value || "";
//   const storeName = cookies().get("storeName")?.value || "";

//   const handleFilterSubmission = async (formData: FormData) => {
//     "use server";

//     const filters: Record<string, string> = {};

//     formData.forEach((value, key) => {
//       if (key === "countryCode" || key === "storeName") {
//         filters[key] = value.toString();
//         cookies().set(key, value.toString(), { maxAge: 60 * 60 * 24 * 30 });
//       }
//     });

//     const queryParams = new URLSearchParams(filters).toString();
//     const targetUrl = `/dashboard/buy?${queryParams}`;

//     redirect(targetUrl);
//   };

//   return (
//     <div className="mx-4 mb-4 flex items-center justify-center rounded-lg bg-white p-4 shadow">
//       <div className="mx-auto flex w-full items-center justify-center text-xs md:max-w-[650px] lg:text-lg">
//         <form className="flex" action={handleFilterSubmission}>
//           {filterOptions.map((option) => (
//             <button
//               key={option.value}
//               value={option.value}
//               name={option.type}
//               type="submit"
//               className={clsx("mx-1 rounded-md bg-gray-100 p-2 font-light", {
//                 "bg-turquoise":
//                   (option.value === countryCode &&
//                     option.type === "countryCode") ||
//                   (option.value === storeName && option.type === "storeName"),
//               })}
//             >
//               {option.label}
//             </button>
//           ))}

//           <button
//             type="submit"
//             className="ml-2 flex items-center justify-center rounded-md bg-black p-2  text-white"
//           >
//             Actualizar ofertas
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

import { ReactSelectFilter } from "@/types";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import clsx from "clsx";

// Definición de los filtros disponibles
const filterOptions: ReactSelectFilter[] = [
  { value: "amazon", label: "Amazon", type: "storeName" },
  { value: "apple", label: "Apple", type: "storeName" },
  { value: "us", label: "US 🇺🇸", type: "countryCode" },
  { value: "ca", label: "CA 🇨🇦", type: "countryCode" },
  { value: "uk", label: "UK 🇬🇧", type: "countryCode" },
];

export const ServerFilter = () => {
  const countryCode = cookies().get("countryCode")?.value || "";
  const storeName = cookies().get("storeName")?.value || "";

  const handleFilterSubmission = async (formData: FormData) => {
    "use server";

    const filters: Record<string, string> = {};

    formData.forEach((value, key) => {
      if (key === "countryCode" || key === "storeName") {
        filters[key] = value.toString();
        cookies().set(key, value.toString(), { maxAge: 60 * 60 * 24 * 30 });
      }
    });

    const queryParams = new URLSearchParams(filters).toString();
    const targetUrl = `/dashboard/buy?${queryParams}`;

    redirect(targetUrl);
  };

  return (
    <div className="mx-4 mb-4 flex items-center justify-center rounded-lg bg-white p-4 shadow">
      <div className="mx-auto flex w-full items-center justify-center text-xs md:max-w-[650px] lg:text-lg">
        <form className="flex" action={handleFilterSubmission} method="post">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              value={option.value}
              name={option.type}
              type="submit"
              className={clsx("mx-1 rounded-md bg-gray-100 p-2 font-light", {
                "bg-turquoise":
                  (option.value === countryCode &&
                    option.type === "countryCode") ||
                  (option.value === storeName && option.type === "storeName"),
              })}
            >
              {option.label}
            </button>
          ))}

          <button
            type="submit"
            className="ml-2 flex items-center justify-center rounded-md bg-black p-2  text-white"
          >
            Actualizar ofertas
          </button>
        </form>
      </div>
    </div>
  );
};
