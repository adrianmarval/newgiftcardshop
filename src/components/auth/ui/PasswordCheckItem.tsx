import { Check, X } from 'lucide-react';

export const PasswordCheckItem = ({ valid, label }: { valid: boolean; label: string }) => (
  <div className="flex items-center gap-2 text-xs">
    {valid ? <Check className="h-3 w-3 text-emerald-400" /> : <X className="h-3 w-3 text-slate-600" />}
    <span className={valid ? 'text-emerald-400' : 'text-slate-500'}>{label}</span>
  </div>
);
