'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { getWhatsAppStatus, reconnectWhatsApp, disconnectWhatsApp } from '@/actions/admin/whatsapp';
import { useAction } from 'next-safe-action/hooks';
import type { WhatsAppFullStatus } from '@/types';

interface WhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (status: { status: string; phoneNumber: string | null }) => void;
}

export function WhatsAppModal({ open, onOpenChange, onStatusChange }: WhatsAppModalProps) {
  const [status, setStatus] = useState<WhatsAppFullStatus>({
    qr: null,
    status: 'disconnected',
    phoneNumber: null,
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { execute: executeReconnect, status: reconnectStatus } = useAction(reconnectWhatsApp, {
    onSuccess: () => {
      startPolling();
    },
  });

  const { execute: executeDisconnect, status: disconnectStatus } = useAction(disconnectWhatsApp, {
    onSuccess: () => {
      stopPolling();
      const newStatus = { status: 'disconnected', phoneNumber: null };
      setStatus({ qr: null, ...newStatus });
      onStatusChange?.(newStatus);
    },
  });

  const fetchStatus = async () => {
    const result = await getWhatsAppStatus();
    if (result?.data) {
      setStatus(result.data);
      onStatusChange?.({ status: result.data.status, phoneNumber: result.data.phoneNumber });
      if (result.data.status === 'open') {
        stopPolling();
      }
    }
  };

  const startPolling = () => {
    stopPolling();
    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, 2000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [open]);

  const isConnecting = status.status === 'connecting' && status.qr;
  const isConnected = status.status === 'open';
  const isLoading = reconnectStatus === 'executing' || disconnectStatus === 'executing';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular WhatsApp</DialogTitle>
          <DialogDescription>
            Escaneá el código QR con WhatsApp en tu teléfono para enviar notificaciones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isConnected ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'
              }`}
            >
              {isConnected ? (
                <CheckCircle className="h-5 w-5" />
              ) : isConnecting ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <span className="text-lg">💬</span>
              )}
            </div>
            <div>
              <p className="font-medium">
                {isConnected ? 'Conectado' : isConnecting ? 'Esperando escaneo...' : 'Desconectado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isConnected && status.phoneNumber ? `Número: ${status.phoneNumber}` : 'Sin número vinculado'}
              </p>
            </div>
          </div>

          {isConnecting && status.qr && (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Abrí WhatsApp en tu teléfono → <span className="font-medium">Ajustes → Dispositivos vinculados → Vincular dispositivo</span>
              </p>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg shadow-inner border">
                  <QRCodeSVG value={status.qr} size={200} />
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground/70">
                El código expira en unos minutos.
              </p>
            </div>
          )}

          {isConnected && (
            <InlineAlert variant="success" title="WhatsApp conectado" description={`Vinculado como ${status.phoneNumber}`} />
          )}

          {reconnectStatus === 'executing' && !isConnected && !isConnecting && (
            <InlineAlert variant="success" title="Reiniciando..." description="Generando nuevo código QR" />
          )}
        </div>

        <DialogFooter>
          {isConnected ? (
            <Button variant="destructive" onClick={() => executeDisconnect()} disabled={isLoading}>
              <XCircle className="mr-2 h-4 w-4" />
              Desconectar
            </Button>
          ) : (
            <Button onClick={() => executeReconnect()} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isConnecting ? 'Reconectar' : 'Vincular'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}