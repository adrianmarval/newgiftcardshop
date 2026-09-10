'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { listCoins, listNetworks } from '@/actions/admin/coins';
import { CoinsTab } from './coins-tab';
import { NetworksTab } from './networks-tab';
import type { CoinWithNetworks, NetworkWithCoins } from '@/types';

interface CoinsManagerProps {
  initialCoins: CoinWithNetworks[];
  initialNetworks: NetworkWithCoins[];
}

type Tab = 'coins' | 'networks';

export function CoinsManager({ initialCoins, initialNetworks }: CoinsManagerProps) {
  const [coins, setCoins] = useState(initialCoins);
  const [networks, setNetworks] = useState(initialNetworks);
  const [tab, setTab] = useState<Tab>('coins');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshCoins = async () => {
    const result = await listCoins();
    if (result.data?.success) setCoins(result.data.coins);
  };

  const refreshNetworks = async () => {
    const result = await listNetworks();
    if (result.data?.success) setNetworks(result.data.networks);
  };

  const tabButton = (t: Tab, label: string) => (
    <Button
      key={t}
      variant={tab === t ? 'default' : 'ghost'}
      size="sm"
      onClick={() => {
        setTab(t);
        setSearchQuery('');
      }}
    >
      {label}
    </Button>
  );

  const tabButtons = (
    <>
      {tabButton('coins', 'Coins')}
      {tabButton('networks', 'Networks')}
    </>
  );

  if (tab === 'coins') {
    return (
      <CoinsTab
        coins={coins}
        networks={networks}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onChanged={refreshCoins}
        tabButtons={tabButtons}
      />
    );
  }

  return (
    <NetworksTab
      networks={networks}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onChanged={refreshNetworks}
      tabButtons={tabButtons}
    />
  );
}
