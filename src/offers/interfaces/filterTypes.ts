export interface FilterOption {
  value: string;
  type: string;
  label?: string;
}

export const filterOptions = [
  {
    type: "brand",
    options: [
      { value: "amazon", label: "Amazon" },
      { value: "apple", label: "Apple" },
      // ... more brands
    ],
  },
  {
    type: "country",
    options: [
      { value: "us", label: "United States (US)" },
      { value: "ca", label: "Canada (CA)" },
      { value: "uk", label: "United Kingdom (UK)" },
      // ... more countries
    ],
  },
];
