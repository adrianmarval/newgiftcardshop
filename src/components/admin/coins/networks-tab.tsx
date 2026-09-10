'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Search, Edit2, Link2 } from 'lucide-react';
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
import { createNetwork, updateNetwork, deleteNetwork, toggleNetworkActive } from '@/actions/admin/coins';
import type { NetworkWithCoins } from '@/types';

interface NetworksTabProps {
  networks: NetworkWithCoins[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onChanged: () => void;
  tabButtons: React.ReactNode;
}

export function NetworksTab({ networks, searchQuery, onSearchChange, onChanged, tabButtons }: NetworksTabProps) {
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [isCreateNetworkDialogOpen, setIsCreateNetworkDialogOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<NetworkWithCoins | null>(null);
  const [newNetwork, setNewNetwork] = useState({ name: '', description: '', regex: '' });

  const { execute: executeCreateNetwork, status: createNetworkStatus } = useAction(createNetwork, {
    onSuccess: () => {
      showAlert.toast.success('Network created');
      setIsCreateNetworkDialogOpen(false);
      setNewNetwork({ name: '', description: '', regex: '' });
      onChanged();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeUpdateNetwork, status: updateNetworkStatus } = useAction(updateNetwork, {
    onSuccess: () => {
      showAlert.toast.success('Network updated');
      setEditingNetwork(null);
      onChanged();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeDeleteNetwork, status: deleteNetworkStatus } = useAction(deleteNetwork, {
    onSuccess: () => {
      showAlert.toast.success('Network deleted');
      setSelectedNetworkId(null);
      onChanged();
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeToggleNetwork, status: toggleNetworkStatus } = useAction(toggleNetworkActive, {
    onSuccess: () => onChanged(),
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const selectedNetwork = useMemo(() => networks.find((n) => n.id === selectedNetworkId), [networks, selectedNetworkId]);

  const filteredNetworks = useMemo(() => {
    if (!searchQuery) return networks;
    const q = searchQuery.toLowerCase();
    return networks.filter((n) => n.name.toLowerCase().includes(q) || n.description.toLowerCase().includes(q));
  }, [networks, searchQuery]);

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
              {tabButtons}
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
            <Input placeholder="Search networks..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" />
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
