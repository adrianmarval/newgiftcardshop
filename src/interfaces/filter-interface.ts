export interface Filter {
  type: string;
  options: FilterOption[];
}

export interface FilterOption {
  value: string;
  type: string;
  label: string;
}

export interface FiltersOptions {
  [category: string]: Filter[] | undefined;
}

export type ParamsFilters = {
  category?: string;
  values?: string | string[];
};

export const filterOptions: FiltersOptions = {
  giftcard: [
    {
      type: 'brand',
      options: [
        { value: 'amazon', label: 'Amazon', type: 'brand' },
        { value: 'apple', label: 'Apple', type: 'brand' },
      ],
    },
    {
      type: 'country',
      options: [
        { value: 'us', label: 'United States (US)', type: 'country' },
        { value: 'ca', label: 'Canada (CA)', type: 'country' },
        { value: 'uk', label: 'United Kingdom (UK)', type: 'country' },
      ],
    },
  ],
  crypto: [
    {
      type: 'country',
      options: [
        { value: 'us', label: 'United States', type: 'country' },
        { value: 'ca', label: 'Canada', type: 'country' },
        { value: 'uk', label: 'United Kingdom', type: 'country' },
      ],
    },
    {
      type: 'coin',
      options: [
        { value: 'usdt', label: 'Usdt (TRC20)', type: 'coin' },
        { value: 'btc', label: 'Bitcoin', type: 'coin' },
        { value: 'eth', label: 'Ethereum', type: 'coin' },
      ],
    },
  ],
};
