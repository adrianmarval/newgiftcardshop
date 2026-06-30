'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Wallet, Trash2, CheckCircle, Pencil, Copy } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { showAlert } from '@/lib/ui';
import {
  getPaymentMethod,
  upsertPaymentMethod,
  deletePaymentMethod,
  listCoinsForSeller,
} from '@/actions/seller/payment-method';
import type { CoinWithNetworks } from '@/types';

interface PaymentMethodSectionProps {
  isSeller: boolean;
}

export function PaymentMethodSection({ isSeller }: PaymentMethodSectionProps) {
  const [coins, setCoins] = useState<CoinWithNetworks[]>([]);
  const [selectedCoinId, setSelectedCoinId] = useState('');
  const [selectedNetworkId, setSelectedNetworkId] = useState('');
  const [address, setAddress] = useState('');
  const [isBinanceWallet, setIsBinanceWallet] = useState(false);
  const [currentPm, setCurrentPm] = useState<{
    id: string;
    coinId: string;
    networkId: string;
    address: string;
    isBinanceWallet: boolean;
    updatedAt: Date;
    coin: { symbol: string; name: string };
    network: { name: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function load() {
      const [coinsResult, pmResult] = await Promise.all([listCoinsForSeller(), getPaymentMethod()]);
      if (coinsResult.data?.success) setCoins(coinsResult.data.coins as CoinWithNetworks[]);
      if (pmResult.data?.success && pmResult.data.paymentMethod) {
        const pm = pmResult.data.paymentMethod;
        setCurrentPm(pm);
        setSelectedCoinId(pm.coinId);
        setSelectedNetworkId(pm.networkId);
        setAddress(pm.address);
        setIsBinanceWallet(pm.isBinanceWallet);
      }
      setLoading(false);
    }
    if (isSeller) load();
    else setLoading(false);
  }, [isSeller]);

  const selectedCoin = coins.find((c) => c.id === selectedCoinId);
  const availableNetworks = selectedCoin?.networks.map((cn) => cn.network) || [];
  const selectedNetwork = availableNetworks.find((n) => n.id === selectedNetworkId) || null;

  const { execute: executeUpsert, status: upsertStatus } = useAction(upsertPaymentMethod, {
    onSuccess: (result) => {
      showAlert.toast.success('Wallet saved');
      if (result.data?.success) {
        setCurrentPm(result.data.paymentMethod);
        setIsEditing(false);
      }
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const { execute: executeDelete, status: deleteStatus } = useAction(deletePaymentMethod, {
    onSuccess: () => {
      showAlert.toast.success('Wallet removed');
      setCurrentPm(null);
      setSelectedCoinId('');
      setSelectedNetworkId('');
      setAddress('');
      setIsBinanceWallet(false);
    },
    onError: (e) => showAlert.toast.error('Error: ' + (e.error?.serverError || 'Unknown')),
  });

  const handleSave = () => {
    if (!selectedCoinId || !selectedNetworkId || !address) return;
    executeUpsert({
      coinId: selectedCoinId,
      networkId: selectedNetworkId,
      address,
      isBinanceWallet,
    });
  };

  if (!isSeller) return null;
  if (loading) return <Spinner />;

  const showForm = !currentPm || isEditing;
  const maskedAddress = currentPm
    ? `${currentPm.address.slice(0, 6)}...${currentPm.address.slice(-4)}`
    : '';

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-1">
          <div className={`flex h-7 w-7 items-center justify-center rounded-md md:h-9 md:w-9 ${currentPm ? 'bg-emerald-500/10' : 'bg-muted'}`}>
            <Wallet className={`h-3.5 w-3.5 md:h-4 md:w-4 ${currentPm ? 'text-emerald-400' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <CardTitle className="text-sm md:text-lg">USDT Wallet</CardTitle>
            <p className="text-muted-foreground hidden text-xs md:block md:text-sm">
              Configure where to receive your payments
            </p>
          </div>
        </div>
        {currentPm && (
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 gap-1 text-xs">
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            )}
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3" /> Configured
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {currentPm && !isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Coin</p>
                <p className="text-sm font-medium">{currentPm.coin.symbol}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Network</p>
                <p className="text-sm font-medium">{currentPm.network.name}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Address</p>
              <div className="flex items-center gap-2">
                <code className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">{maskedAddress}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(currentPm.address);
                    showAlert.toast.success('Address copied');
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>{currentPm.isBinanceWallet ? '🏦' : '🔗'}</span>
                <span>{currentPm.isBinanceWallet ? 'Binance' : 'External'} wallet</span>
                {!currentPm.isBinanceWallet && (
                  <span className="text-slate-500">· Min $10 payout</span>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Updated {new Date(currentPm.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (await showAlert.confirm('Remove wallet', 'Remove your wallet configuration?')) {
                  executeDelete();
                }
              }}
              disabled={deleteStatus === 'executing'}
              className="mt-1"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Coin</Label>
                <Select
                  value={selectedCoinId}
                  onValueChange={(v) => {
                    setSelectedCoinId(v);
                    setSelectedNetworkId('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select coin" />
                  </SelectTrigger>
                  <SelectContent>
                    {coins.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.symbol} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Network</Label>
                <Select value={selectedNetworkId} onValueChange={setSelectedNetworkId} disabled={!selectedCoinId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNetworks.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Wallet Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={selectedNetwork ? `Enter ${selectedNetwork.name} address` : 'Select network first'}
                disabled={!selectedNetworkId}
              />
              {selectedNetwork && (
                <p className="text-muted-foreground text-xs">
                  Regex: <code className="bg-muted rounded px-1">{selectedNetwork.regex}</code>
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Wallet Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={isBinanceWallet ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsBinanceWallet(true)}
                >
                  🏦 Binance
                </Button>
                <Button
                  type="button"
                  variant={!isBinanceWallet ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsBinanceWallet(false)}
                >
                  🔗 External
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                {isBinanceWallet
                  ? 'No minimum payout. Withdraw directly from Binance.'
                  : 'Minimum payout $10 per batch. Funds sent to your external wallet.'}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={upsertStatus === 'executing' || !selectedCoinId || !selectedNetworkId || !address}>
                {upsertStatus === 'executing' ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {currentPm ? 'Update' : 'Save'}
              </Button>
              {currentPm && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              )}
              {currentPm && (
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (await showAlert.confirm('Remove wallet', 'Remove your wallet configuration?')) {
                      executeDelete();
                    }
                  }}
                  disabled={deleteStatus === 'executing'}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
