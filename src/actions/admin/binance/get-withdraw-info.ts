'use server';

import { adminActionClient } from '@/lib/safe-action';
import { getWithdrawDestinationInfo } from '@/lib/services/payment/admin-withdrawal';
import { getWithdrawInfoOutputSchema } from './schemas';

export const getWithdrawInfo = adminActionClient.outputSchema(getWithdrawInfoOutputSchema).action(async () => {
  return getWithdrawDestinationInfo();
});
