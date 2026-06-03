export function StatusLeyend({ language = 'es' }: { language?: 'en' | 'es' }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-2">
      <div className="text-muted-foreground/80 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase">
        <div className="h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        <span>{language === 'en' ? 'In Progress' : 'En Proceso'}</span>
      </div>
      <div className="text-muted-foreground/80 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase">
        <div className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
        <span>{language === 'en' ? 'Confirmed' : 'Confirmado'}</span>
      </div>
      <div className="text-muted-foreground/80 flex items-center gap-2 text-[10px] font-black tracking-widest uppercase">
        <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span>{language === 'en' ? 'Paid' : 'Pagado'}</span>
      </div>
    </div>
  );
}
