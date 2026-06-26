'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { InlineAlert } from '@/components/ui/inline-alert';

export interface Disable2FAFlowProps {
  isSpanish: boolean;
  is2FAPending: boolean;
  twoFactorError: string;
  password: string;
  onPasswordChange: (value: string) => void;
  onDisable: () => void;
  onDismissError: () => void;
}

export const Disable2FAFlow = ({
  isSpanish,
  is2FAPending,
  twoFactorError,
  password,
  onPasswordChange,
  onDisable,
  onDismissError,
}: Disable2FAFlowProps) => {
  return (
    <div className="space-y-3">
      {twoFactorError && (
        <InlineAlert variant="error" title={twoFactorError} autoDismiss dismissAfter={3000} onDismiss={onDismissError} />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="disablePassword" className="text-[10px] font-medium md:text-xs">
          {isSpanish ? 'Contraseña' : 'Password'}
        </Label>
        <Input
          id="disablePassword"
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="••••••••"
          className="h-9 text-xs md:h-10 md:text-sm"
        />
      </div>

      <Button
        variant="destructive"
        onClick={onDisable}
        className="h-9 w-full rounded-md text-[10px] font-semibold md:h-10 md:text-xs"
        disabled={is2FAPending || !password}
      >
        {is2FAPending ? (
          <span className="flex items-center gap-1.5">
            <Spinner size="sm" className="text-white" />
          </span>
        ) : isSpanish ? (
          'Deshabilitar 2FA'
        ) : (
          'Disable 2FA'
        )}
      </Button>
    </div>
  );
};
