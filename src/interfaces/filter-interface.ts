export interface FilterOption {
  value: string;
  label: string;
}

export interface Filter {
  type: string;
  options: FilterOption[];
}

export const availableFilters: Filter[] = [
  {
    type: 'brand',
    options: [
      { value: 'amazon', label: 'Amazon' },
      { value: 'apple', label: 'Apple' },
      // ... más opciones de marca
    ],
  },
  {
    type: 'country',
    options: [
      { value: 'us', label: 'United States (US)' },
      { value: 'ca', label: 'Canada (CA)' },
      { value: 'uk', label: 'United Kingdom (UK)' },
      // ... más opciones de país
    ],
  },
];
