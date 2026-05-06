import { cn } from '@/lib/utils';
import { Loader2Icon } from 'lucide-react';

export interface SpinnerProps extends React.ComponentProps<'svg'> {
  size?: 'sm' | 'md' | 'lg';
}

function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-20',
  };

  return <Loader2Icon role="status" aria-label="Loading" className={cn(sizeClasses[size], 'animate-spin', className)} {...props} />;
}

export { Spinner };
