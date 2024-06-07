'use client';

import clsx from 'clsx';
import { IoCheckmarkCircleOutline, IoOptionsOutline, IoTrashOutline } from 'react-icons/io5';
import { usePathname } from 'next/navigation';
import { useOfferFilter } from '@/hooks';
import { filterOptions } from '@/interfaces/filter-interface';

export const FilterBar = () => {
  const pathName = usePathname();
  const category = pathName.split('/')[3] as string;

  const { activeFilters, handleApplyFilter, handleFilterChange, handleClearFilters, toggleFilterIsOpen, filterIsOpen } =
    useOfferFilter(category);

  return (
    <>
      <div onClick={toggleFilterIsOpen} className="relative mx-4 mb-4 flex justify-center">
        <button className="relative w-full rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
            <IoOptionsOutline size={25} />
          </div>
          {activeFilters.length > 0 && (
            <div className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
              <span className="text-xs">{activeFilters.length}</span>
            </div>
          )}
        </button>
      </div>

      {filterIsOpen && <div className="absolute inset-0 z-10 h-full w-full bg-black opacity-10" onClick={toggleFilterIsOpen}></div>}

      <div
        className={clsx(
          'fixed right-0 top-0 z-20 h-full w-64 transform overflow-y-auto bg-white p-4 shadow-lg transition-transform duration-300',
          { 'translate-x-0': filterIsOpen, 'translate-x-full': !filterIsOpen },
        )}
      >
        <h3 className="mb-4 mt-20 text-xl font-semibold text-gray-900">Opciones de Filtro</h3>
        {filterOptions[category]?.map((option) => (
          <div key={option.type} className="filter-dropdown">
            <h3 className="text-sm font-semibold">{option.type}</h3>
            <ul>
              {option.options.map((opcion) => (
                <li className="flex items-center rounded-lg px-2" key={opcion.value}>
                  <input
                    type="checkbox"
                    id={opcion.value}
                    checked={activeFilters.some((filter) => filter.value === opcion.value && filter.type === option.type)}
                    onChange={() => handleFilterChange({ label: opcion.label, value: opcion.value, type: option.type })}
                  />
                  <label htmlFor={opcion.value} className="mx-1 h-full w-full cursor-pointer py-2">
                    {opcion.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <button
          onClick={handleClearFilters}
          className="mt-4 flex w-full items-center justify-center rounded-lg bg-black p-2 text-white shadow hover:bg-red-400"
        >
          <span className="mr-2">Clear</span>
          <IoTrashOutline size={20} />
        </button>
        <button onClick={handleApplyFilter} className="mt-2 flex w-full items-center justify-center rounded-lg bg-white p-2 shadow">
          <span className="mr-2">Apply</span>
          <IoCheckmarkCircleOutline size={20} />
        </button>
      </div>
    </>
  );
};
