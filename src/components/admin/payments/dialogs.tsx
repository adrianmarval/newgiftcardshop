'use client';

import { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { createDeposit } from '@/actions/admin/admin-create-deposit';
import { withdrawBalanceAction } from '@/actions/admin/binance';
import { createRefund } from '@/actions/admin/admin-create-refund';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AdminDepositDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [binanceTxId, setBinanceTxId] = useState('');
  const [notes, setNotes] = useState('');

  const { execute, isExecuting, status } = useAction(createDeposit, {
    onSuccess: (res) => {
      if (res.data?.success) {
        setOpen(false);
        setAmount('');
        setBinanceTxId('');
        setNotes('');
      }
    },
    onError: (err) => {
      console.error(err);
    }
  });

  const loading = isExecuting || status === 'executing';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute({
      amount: parseFloat(amount),
      binanceTxId: binanceTxId || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Deposit</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Registrar Depósito Manual</DialogTitle>
            <DialogDescription>
              Añade saldo a la plataforma registrando un depósito desde Binance u otra fuente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Monto (USDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="binanceTxId">Binance TxID (Opcional)</Label>
              <Input
                id="binanceTxId"
                value={binanceTxId}
                onChange={(e) => setBinanceTxId(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !amount}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Depositar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminWithdrawDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const { execute, isExecuting, status } = useAction(withdrawBalanceAction, {
    onSuccess: (res) => {
      if (res.data) {
        setOpen(false);
        setAmount('');
      }
    },
    onError: (err) => {
      console.error(err);
    }
  });

  const loading = isExecuting || status === 'executing';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute({
      amount: parseFloat(amount),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">- Withdraw</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Retirar Fondos (Binance)</DialogTitle>
            <DialogDescription>
              Retira USDT de la cuenta de Binance hacia la billetera configurada en tu entorno.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="w-amount">Monto (USDT)</Label>
              <Input
                id="w-amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !amount}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Retirar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminRefundDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [refundType, setRefundType] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [relatedUserId, setRelatedUserId] = useState('');
  const [referenceType, setReferenceType] = useState<'ORDER' | 'BATCH'>('ORDER');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  const { execute, isExecuting, status } = useAction(createRefund, {
    onSuccess: (res) => {
      if (res.data?.success) {
        setOpen(false);
        setAmount('');
        setRelatedUserId('');
        setReferenceId('');
        setNotes('');
      }
    },
    onError: (err) => {
      console.error(err);
    }
  });

  const loading = isExecuting || status === 'executing';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    execute({
      amount: parseFloat(amount),
      refundType,
      relatedUserId,
      referenceType,
      referenceId,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">- Refund</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Emitir Reembolso</DialogTitle>
            <DialogDescription>
              Devuelve dinero a un usuario (comprador o vendedor) asociando una orden o batch.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Usuario</Label>
                <Select value={refundType} onValueChange={(val) => setRefundType(val as 'BUYER' | 'SELLER')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUYER">Comprador</SelectItem>
                    <SelectItem value="SELLER">Vendedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Referencia</Label>
                <Select value={referenceType} onValueChange={(val) => setReferenceType(val as 'ORDER' | 'BATCH')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORDER">Orden</SelectItem>
                    <SelectItem value="BATCH">Batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="user-id">ID del Usuario</Label>
              <Input
                id="user-id"
                required
                value={relatedUserId}
                onChange={(e) => setRelatedUserId(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ref-id">ID de la Referencia</Label>
              <Input
                id="ref-id"
                required
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="r-amount">Monto (USDT)</Label>
              <Input
                id="r-amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="r-notes">Notas (Opcional)</Label>
              <Input
                id="r-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !amount || !relatedUserId || !referenceId}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reembolsar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
