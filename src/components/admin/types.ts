import type { InlineAlertVariant } from '@/components/ui/inline-alert';

export interface AlertState {
  variant: InlineAlertVariant;
  title: string;
  description?: string;
}
