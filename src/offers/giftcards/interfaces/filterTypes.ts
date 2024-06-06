interface FilterOption {
  type: string;
  options: { value: string; label: string }[];
}

interface FilterOptions {
  [key: string]: FilterOption[];
}

export const filterOptions: FilterOptions = {
  giftcard: [
    {
      type: 'brand',
      options: [
        { value: 'amazon', label: 'Amazon' },
        { value: 'apple', label: 'Apple' },
      ],
    },
    {
      type: 'country',
      options: [
        { value: 'us', label: 'United States (US)' },
        { value: 'ca', label: 'Canada (CA)' },
        { value: 'uk', label: 'United Kingdom (UK)' },
      ],
    },
  ],
  crypto: [
    {
      type: 'country',
      options: [
        { value: 'us', label: 'United States' },
        { value: 'ca', label: 'Canada' },
        { value: 'uk', label: 'United Kingdom' },
      ],
    },
    {
      type: 'coin',
      options: [
        { value: 'usdt', label: 'Usdt (TRC20)' },
        { value: 'btc', label: 'Bitcoin' },
        { value: 'eth', label: 'Ethereum' },
      ],
    },
  ],
};
