import { useState } from 'react';

interface Props {
  onSortChange: (sortOption: string) => void;
}

export const SortDropdown = ({ onSortChange }: Props) => {
  const [selectedSort, setSelectedSort] = useState('recent'); // Default: Más reciente

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sortOption = event.target.value;
    setSelectedSort(sortOption);
    onSortChange(sortOption);
  };

  return (
    <>
      <select
        defaultValue={selectedSort}
        onChange={handleSortChange}
        className="sortDropdownSelect w-46 cursor-pointer rounded border bg-white p-1 font-light"
      >
        <option value="totalAmount_asc">Monto: Menor a Mayor</option>
        <option value="totalAmount_desc">Monto: Mayor a Menor</option>
      </select>
    </>
  );
};
