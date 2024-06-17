import { getGiftcards } from '@/actions/giftcard/get-giftcards';
import { GiftcardsTodo } from './ui';

const page = async () => {
  const giftcards = await getGiftcards();
  const publishedAmount = 100;

  return (
    <div className="animate__animated animate__fadeIn rounded-xl bg-white">
      <GiftcardsTodo giftcards={giftcards} />
    </div>
  );
};

export default page;
