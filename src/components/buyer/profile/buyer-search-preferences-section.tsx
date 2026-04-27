'use client';

import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SearchPreferencesForm } from '@/components/ui/search-preferences-form';
import { getUserSearchPreferences } from '@/actions/user/search-preferences';
import { updateSearchPreferences } from '@/actions/user/search-preferences';

interface BuyerSearchPreferencesSectionProps {
  preferencesPromise: ReturnType<typeof getUserSearchPreferences>;
}

export function BuyerSearchPreferencesSection({ preferencesPromise }: BuyerSearchPreferencesSectionProps) {
  const preferences = use(preferencesPromise);

  const handleSave = async (prefs: { minAmount: number | null; maxAmount: number | null }) => {
    const result = await updateSearchPreferences({
      minAmount: prefs.minAmount,
      maxAmount: prefs.maxAmount,
    });
    if (result.serverError) {
      throw new Error(result.serverError);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Preferencias de Búsqueda</CardTitle>
        <CardDescription>Configurá los montos de tarjetas que buscás por defecto.</CardDescription>
      </CardHeader>
      <CardContent>
        <SearchPreferencesForm
          minAmount={preferences?.minAmount}
          maxAmount={preferences?.maxAmount}
          onSave={handleSave}
        />
      </CardContent>
    </Card>
  );
}
