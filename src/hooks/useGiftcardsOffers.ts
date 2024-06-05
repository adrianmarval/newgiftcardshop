import { GiftcardOffer } from '@/offers/giftcards/interfaces/offer-interface';
import { offersStore } from '@/store';

export const useGiftcardsOffers = () => {
  const { isLoading, setIsLoading, offers, setOffers } = offersStore((state) => state);

  const getOffers = async (filters: { value: string; type: string }[]) => {
    try {
      setIsLoading(true);
      const offers: GiftcardOffer[] = await fetch('/api/offers').then((res) => res.json());
      if (filters.length === 0) {
        setOffers(offers);
        setIsLoading(false);
        return;
      }
      const filteredOffers = offers.filter((offer) => {
        const countryOptions = filters.filter((offer) => offer.type === 'country');
        const cardNameOptions = filters.filter((offer) => offer.type === 'brand');

        const matchesCountry = countryOptions.length === 0 || countryOptions.some((option) => offer.countryCode === option.value);

        const matchesCardName = cardNameOptions.length === 0 || cardNameOptions.some((option) => offer.storeName === option.value);

        return matchesCountry && matchesCardName;
      });

      setOffers(filteredOffers);
      setIsLoading(false);
    } catch (error) {
      setOffers([]);
      throw error;
    }
  };

  return {
    offers,
    isLoading,
    getOffers,
  };
};
