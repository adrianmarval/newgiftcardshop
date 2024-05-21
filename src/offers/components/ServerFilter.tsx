import { ReactSelectFilter } from "@/types";
import { redirect } from "next/navigation";

// Definición de los filtros disponibles
const filterOptions: ReactSelectFilter[] = [
  { value: "us", label: "US 🇺🇸", type: "countryCode" },
  { value: "ca", label: "CA 🇨🇦", type: "countryCode" },
  { value: "uk", label: "UK 🇬🇧", type: "countryCode" },
  { value: "amazon", label: "Amazon", type: "storeName" },
  { value: "apple", label: "Apple", type: "storeName" },
];

export const ServerFilter = () => {
  const handleFilterSubmission = async (formData: FormData) => {
    "use server";

    const filters: Record<string, string> = {};
    formData.forEach((value, key) => {
      filters[key] = value.toString();
    });

    const queryParams = new URLSearchParams(filters).toString();
    const targetUrl = `/dashboard/buy?${queryParams}`;

    redirect(targetUrl);
  };

  return (
    <div className="mx-4 mb-4 flex items-center justify-center rounded-lg bg-white p-4 shadow">
      <div className="mx-auto flex w-full items-center justify-center text-xs md:max-w-[650px] lg:text-lg">
        <form className="flex" action={handleFilterSubmission}>
          <select
            name="countryCode"
            className="rounded-xl bg-turquoise p-1 text-white"
          >
            <option value="">Select Country</option>
            {filterOptions
              .filter((option) => option.type === "countryCode")
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>

          <select
            name="storeName"
            className="ml-2 rounded-xl bg-turquoise p-1 text-white"
          >
            <option value="">Select Store</option>
            {filterOptions
              .filter((option) => option.type === "storeName")
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>

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
