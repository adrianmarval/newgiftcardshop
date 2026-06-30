'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Search, Edit2, X, Check, Coins, Link2, Unlink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/ui';
import {
  listCoins,
  createCoin,
  updateCoin,
  deleteCoin,
  toggleCoinActive,
  listNetworks,
  createNetwork,
  updateNetwork,
  deleteNetwork,
  toggleNetworkActive,
  addNetworkToCoin,
  removeNetworkFromCoin,
} from '@/actions/admin/coins';
import type { CoinWithNetworks, NetworkWithCoins } from '@/types';

interface CoinsManagerProps {
  initialCoins: CoinWithNetworks[];
  initialNetworks: NetworkWithCoins[];
}

type Tab = 'coins' | 'networks';

export function CoinsManager({ initialCoins, initialNetworks }: CoinsManagerProps) {
  const [coins, setCoins] = useState(initialCoins);
  const [networks, setNetworks] = useState(initialNetworks);
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('coins');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Dialogs ──────────────────────────────────────────────────────────────
  const [isCreateCoinDialogOpen, setIsCreateCoinDialogOpen] = useState(false);
  const [isCreateNetworkDialogOpen, setIsCreateNetworkDialogOpen] = useState(false);
  const [editingCoin, setEditingCoin] = useState<CoinWithNetworks | null>(null);
  const [editingNetwork, setEditingNetwork] = useState<NetworkWithCoins | null>(null);

  // ── Form state ───────────────────────────────────────────────────────────
  const [newCoin, setNewCoin] = useState({ name: '', symbol: '', decimals: '18' });
  const [newNetwork, setNewNetwork] = useState({ name: '', description: '', regex: '' });

  // ── Actions ──────────────────────────────────────────────────────────────
  const { execute: executeCreateCoin, status: createCoinStatus } = useAction(createCoin, {
    onSuccess: () => {
      showAlert.toast.success('Coin created');
      setIsCreateCoinDialogOpen(false);
      setNewCoin({ name: '', symbol: '', decimals: '18' });
      refreshCoins();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeUpdateCoin, status: updateCoinStatus } = useAction(updateCoin, {
    onSuccess: () => {
      showAlert.toast.success('Coin updated');
      setEditingCoin(null);
      refreshCoins();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeDeleteCoin, status: deleteCoinStatus } = useAction(deleteCoin, {
    onSuccess: () => {
      showAlert.toast.success('Coin deleted');
      setSelectedCoinId(null);
      refreshCoins();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeToggleCoin, status: toggleCoinStatus } = useAction(toggleCoinActive, {
    onSuccess: () => refreshCoins(),
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeCreateNetwork, status: createNetworkStatus } = useAction(createNetwork, {
    onSuccess: () => {
      showAlert.toast.success('Network created');
      setIsCreateNetworkDialogOpen(false);
      setNewNetwork({ name: '', description: '', regex: '' });
      refreshNetworks();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeUpdateNetwork, status: updateNetworkStatus } = useAction(updateNetwork, {
    onSuccess: () => {
      showAlert.toast.success('Network updated');
      setEditingNetwork(null);
      refreshNetworks();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeDeleteNetwork, status: deleteNetworkStatus } = useAction(deleteNetwork, {
    onSuccess: () => {
      showAlert.toast.success('Network deleted');
      setSelectedNetworkId(null);
      refreshNetworks();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeToggleNetwork, status: toggleNetworkStatus } = useAction(toggleNetworkActive, {
    onSuccess: () => refreshNetworks(),
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeAddNetwork, status: addNetworkStatus } = useAction(addNetworkToCoin, {
    onSuccess: () => {
      showAlert.toast.success('Network linked');
      refreshCoins();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeRemoveNetwork, status: removeNetworkStatus } = useAction(removeNetworkFromCoin, {
    onSuccess: () => {
      showAlert.toast.success('Network unlinked');
      refreshCoins();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  // ── Refresh ──────────────────────────────────────────────────────────────
  const refreshCoins = async () => {
    const result = await listCoins();
    if (result.data?.success) setCoins(result.data.coins);
  };

  const refreshNetworks = async () => {
    const result = await listNetworks();
    if (result.data?.success) setNetworks(result.data.networks);
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const selectedCoin = useMemo(() => coins.find((c) => c.id === selectedCoinId), [coins, selectedCoinId]);
  const selectedNetwork = useMemo(() => networks.find((n) => n.id === selectedNetworkId), [networks, selectedNetworkId]);

  const filteredCoins = useMemo(() => {
    if (!searchQuery) return coins;
    const q = searchQuery.toLowerCase();
    return coins.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  }, [coins, searchQuery]);

  const filteredNetworks = useMemo(() => {
    if (!searchQuery) return networks;
    const q = searchQuery.toLowerCase();
    return networks.filter((n) => n.name.toLowerCase().includes(q) || n.description.toLowerCase().includes(q));
  }, [networks, searchQuery]);

  const availableNetworksForCoin = useMemo(() => {
    if (!selectedCoin) return networks;
    const linkedIds = new Set(selectedCoin.networks.map((cn) => cn.networkId));
    return networks.filter((n) => !linkedIds.has(n.id) && n.isActive);
  }, [selectedCoin, networks]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateCoin = () => {
    if (!newCoin.name || !newCoin.symbol) return;
    executeCreateCoin({
      name: newCoin.name,
      symbol: newCoin.symbol.toUpperCase(),
      decimals: parseInt(newCoin.decimals) || 18,
    });
  };

  const handleUpdateCoin = () => {
    if (!editingCoin) return;
    executeUpdateCoin({
      id: editingCoin.id,
      name: editingCoin.name,
      symbol: editingCoin.symbol,
      decimals: editingCoin.decimals,
    });
  };

  const handleCreateNetwork = () => {
    if (!newNetwork.name || !newNetwork.regex) return;
    executeCreateNetwork(newNetwork);
  };

  const handleUpdateNetwork = () => {
    if (!editingNetwork) return;
    executeUpdateNetwork({
      id: editingNetwork.id,
      name: editingNetwork.name,
      description: editingNetwork.description,
      regex: editingNetwork.regex,
    });
  };

  // ── Tab Buttons ──────────────────────────────────────────────────────────
  const tabButton = (t: Tab, label: string) => (
    <Button
      key={t}
      variant={tab === t ? 'default' : 'ghost'}
      size="sm"
      onClick={() => {
        setTab(t);
        setSearchQuery('');
        setSelectedCoinId(null);
        setSelectedNetworkId(null);
      }}
    >
      {label}
    </Button>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // COINS TAB
  // ══════════════════════════════════════════════════════════════════════════
  if (tab === 'coins') {
    return (
      <div className="flex h-full flex-col gap-1 md:flex-row">
        {/* Left Panel: Coins List */}
        <Card className="flex w-full shrink-0 flex-col overflow-hidden md:w-1/3 md:min-w-[320px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" /> Coins
              </CardTitle>
              <div className="flex gap-1">
                {tabButton('coins', 'Coins')}
                {tabButton('networks', 'Networks')}
                <Dialog open={isCreateCoinDialogOpen} onOpenChange={setIsCreateCoinDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1">
                      <Plus className="h-4 w-4" /> New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Coin</DialogTitle>
                      <DialogDescription className="sr-only">Detalles de la nueva moneda</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1 py-4">
                      <div>
                        <Label>Name</Label>
                        <Input value={newCoin.name} onChange={(e) => setNewCoin((p) => ({ ...p, name: e.target.value }))} placeholder="Tether USD" />
                      </div>
                      <div>
                        <Label>Symbol</Label>
                        <Input value={newCoin.symbol} onChange={(e) => setNewCoin((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))} placeholder="USDT" />
                      </div>
                      <div>
                        <Label>Decimals</Label>
                        <Input type="number" value={newCoin.decimals} onChange={(e) => setNewCoin((p) => ({ ...p, decimals: e.target.value }))} placeholder="18" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateCoinDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateCoin} disabled={createCoinStatus === 'executing'}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input placeholder="Search coins..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="custom-scrollbar flex-1 space-y-1 overflow-y-auto">
            <AnimatePresence>
              {filteredCoins.map((coin) => (
                <motion.div
                  key={coin.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                    selectedCoinId === coin.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedCoinId(coin.id)}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${coin.isActive ? 'bg-green-500/10' : 'bg-muted'}`}>
                    <span className="text-sm font-bold">{coin.symbol}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate font-medium">{coin.name}</span>
                      {!coin.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                    <span className="text-muted-foreground text-xs">{coin.networks.length} networks</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Right Panel: Coin Details */}
        <Card className="w-full flex-1 md:w-auto">
          {selectedCoin ? (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                      <span className="text-lg font-bold">{selectedCoin.symbol}</span>
                    </div>
                    <div>
                      <CardTitle>{selectedCoin.name}</CardTitle>
                      <span className="text-muted-foreground text-sm">Decimals: {selectedCoin.decimals}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setEditingCoin(selectedCoin)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={selectedCoin.isActive ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => executeToggleCoin({ id: selectedCoin.id, isActive: !selectedCoin.isActive })}
                      disabled={toggleCoinStatus === 'executing'}
                    >
                      {selectedCoin.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (await showAlert.confirm('Delete coin', 'Delete this coin?')) {
                          executeDeleteCoin({ id: selectedCoin.id });
                        }
                      }}
                      disabled={deleteCoinStatus === 'executing'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">Networks ({selectedCoin.networks.length})</h3>
                  <Dialog
                    open={!!editingCoin}
                    onOpenChange={(open) => {
                      if (!open) setEditingCoin(null);
                    }}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Coin</DialogTitle>
                        <DialogDescription className="sr-only">Editar moneda</DialogDescription>
                      </DialogHeader>
                      {editingCoin && (
                        <div className="space-y-1 py-4">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={editingCoin.name}
                              onChange={(e) => setEditingCoin((p) => (p ? { ...p, name: e.target.value } : p))}
                            />
                          </div>
                          <div>
                            <Label>Symbol</Label>
                            <Input
                              value={editingCoin.symbol}
                              onChange={(e) => setEditingCoin((p) => (p ? { ...p, symbol: e.target.value.toUpperCase() } : p))}
                            />
                          </div>
                          <div>
                            <Label>Decimals</Label>
                            <Input
                              type="number"
                              value={editingCoin.decimals}
                              onChange={(e) => setEditingCoin((p) => (p ? { ...p, decimals: parseInt(e.target.value) || 0 } : p))}
                            />
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingCoin(null)}>Cancel</Button>
                        <Button onClick={handleUpdateCoin} disabled={updateCoinStatus === 'executing'}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Linked networks */}
                <div className="space-y-1">
                  {selectedCoin.networks.map((cn) => (
                    <div
                      key={cn.id}
                      className={`flex items-center gap-2 rounded-lg border p-3 ${cn.network.isActive ? 'border-border' : 'border-amber-500/30 bg-amber-500/5'}`}
                    >
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
                        <Link2 className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{cn.network.name}</span>
                          {!cn.network.isActive && (
                            <Badge variant="outline" className="border-amber-500 text-xs text-amber-500">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground block text-xs truncate">{cn.network.description || cn.network.regex}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => executeRemoveNetwork({ coinId: selectedCoin.id, networkId: cn.networkId })}
                        disabled={removeNetworkStatus === 'executing'}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {availableNetworksForCoin.length > 0 && (
                    <div className="pt-2">
                      <Label className="text-muted-foreground text-xs">Add network</Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {availableNetworksForCoin.map((n) => (
                          <Button
                            key={n.id}
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => executeAddNetwork({ coinId: selectedCoin.id, networkId: n.id })}
                            disabled={addNetworkStatus === 'executing'}
                          >
                            <Plus className="h-3 w-3" /> {n.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex h-full items-center justify-center">
              <div className="text-muted-foreground text-center">
                <Coins className="mx-auto h-12 w-12 opacity-30" />
                <p>Select a coin to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NETWORKS TAB
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex h-full flex-col gap-1 md:flex-row">
      {/* Left Panel: Networks List */}
      <Card className="flex w-full shrink-0 flex-col overflow-hidden md:w-1/3 md:min-w-[320px]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Networks
            </CardTitle>
            <div className="flex gap-1">
              {tabButton('coins', 'Coins')}
              {tabButton('networks', 'Networks')}
              <Dialog open={isCreateNetworkDialogOpen} onOpenChange={setIsCreateNetworkDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" /> New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Network</DialogTitle>
                    <DialogDescription className="sr-only">Detalles de la nueva red</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={newNetwork.name} onChange={(e) => setNewNetwork((p) => ({ ...p, name: e.target.value }))} placeholder="BSC" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input value={newNetwork.description} onChange={(e) => setNewNetwork((p) => ({ ...p, description: e.target.value }))} placeholder="BNB Smart Chain" />
                    </div>
                    <div>
                      <Label>Address Regex</Label>
                      <Input value={newNetwork.regex} onChange={(e) => setNewNetwork((p) => ({ ...p, regex: e.target.value }))} placeholder="^0x[0-9a-fA-F]{40}$" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateNetworkDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateNetwork} disabled={createNetworkStatus === 'executing'}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input placeholder="Search networks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="custom-scrollbar flex-1 space-y-1 overflow-y-auto">
          <AnimatePresence>
            {filteredNetworks.map((network) => (
              <motion.div
                key={network.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                  selectedNetworkId === network.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedNetworkId(network.id)}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${network.isActive ? 'bg-blue-500/10' : 'bg-muted'}`}>
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-medium">{network.name}</span>
                    {!network.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  <span className="text-muted-foreground text-xs">{network.coins.length} coins</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Right Panel: Network Details */}
      <Card className="w-full flex-1 md:w-auto">
        {selectedNetwork ? (
          <>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedNetwork.name}</CardTitle>
                  <span className="text-muted-foreground text-sm">{selectedNetwork.description}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setEditingNetwork(selectedNetwork)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={selectedNetwork.isActive ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => executeToggleNetwork({ id: selectedNetwork.id, isActive: !selectedNetwork.isActive })}
                    disabled={toggleNetworkStatus === 'executing'}
                  >
                    {selectedNetwork.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (await showAlert.confirm('Delete network', 'Delete this network?')) {
                        executeDeleteNetwork({ id: selectedNetwork.id });
                      }
                    }}
                    disabled={deleteNetworkStatus === 'executing'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <h3 className="font-semibold">Regex Validation</h3>
                <code className="bg-muted mt-1 block rounded p-2 text-sm">{selectedNetwork.regex}</code>
              </div>
              <h3 className="font-semibold">Linked Coins ({selectedNetwork.coins.length})</h3>
              <div className="mt-1 space-y-1">
                {selectedNetwork.coins.map((cn) => (
                  <div key={cn.id} className="flex items-center gap-2 rounded-lg border p-3">
                    <span className="font-medium">{cn.coin.symbol}</span>
                    <span className="text-muted-foreground text-sm">{cn.coin.name}</span>
                  </div>
                ))}
              </div>

              {/* Edit Dialog */}
              <Dialog open={!!editingNetwork} onOpenChange={(open) => { if (!open) setEditingNetwork(null); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Network</DialogTitle>
                    <DialogDescription className="sr-only">Editar red</DialogDescription>
                  </DialogHeader>
                  {editingNetwork && (
                    <div className="space-y-1 py-4">
                      <div>
                        <Label>Name</Label>
                        <Input value={editingNetwork.name} onChange={(e) => setEditingNetwork((p) => (p ? { ...p, name: e.target.value } : p))} />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input value={editingNetwork.description} onChange={(e) => setEditingNetwork((p) => (p ? { ...p, description: e.target.value } : p))} />
                      </div>
                      <div>
                        <Label>Regex</Label>
                        <Input value={editingNetwork.regex} onChange={(e) => setEditingNetwork((p) => (p ? { ...p, regex: e.target.value } : p))} />
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingNetwork(null)}>Cancel</Button>
                    <Button onClick={handleUpdateNetwork} disabled={updateNetworkStatus === 'executing'}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex h-full items-center justify-center">
            <div className="text-muted-foreground text-center">
              <Link2 className="mx-auto h-12 w-12 opacity-30" />
              <p>Select a network to view details</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
