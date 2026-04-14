'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, AlertTriangle, ChevronRight, X, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { getUserBuyRate } from '@/actions/order-actions';
import { reportGiftcardIssue, undoGiftcardIssue } from '@/actions/buyer-actions';
import { GiftcardIssueType } from '@/generated/prisma/enums';
import { toast } from 'sonner';
import { BuyFlowGiftcardStatus } from '@/types';
import { Spinner } from '@/components/ui/spinner';
import { useAction } from 'next-safe-action/hooks';

export const RedeemStep = () => {
  const { foundGiftcards, reportIssue, setStep, orderId } = useBuyFlow();

  const [redeemState, setRedeemState] = useState<{
    activeReportId: string | null;
    correctedAmount: string;
    buyRate: number;
    loadingIds: Set<string>;
  }>({
    activeReportId: null,
    correctedAmount: '',
    buyRate: 0.85,
    loadingIds: new Set<string>(),
  });

  const { execute: executeGetUserBuyRate } = useAction(getUserBuyRate, {
    onSuccess: ({ data }) => {
      const rate = data;
      if (typeof rate === 'number') {
        setRedeemState((prev) => ({ ...prev, buyRate: rate }));
      }
    },
  });

  useEffect(() => {
    executeGetUserBuyRate();
  }, [executeGetUserBuyRate]);

  const setLoading = (id: string, loading: boolean) => {
    setRedeemState((prev) => {
      const next = new Set(prev.loadingIds);
      if (loading) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return { ...prev, loadingIds: next };
    });
  };

  const handleReport = async (id: string, status: GiftcardIssueType) => {
    if (status === 'WRONG_AMOUNT') {
      setRedeemState((prev) => ({ ...prev, activeReportId: id }));
      return;
    }
    // Optimistic local update
    reportIssue(id, status);
    if (!orderId) return;
    setLoading(id, true);
    const result = await reportGiftcardIssue({
      giftcardId: id,
      orderId,
      issueType: status,
    });
    if (!result.data) {
      toast.error('Error al reportar el problema', {
        description: result.serverError || result.validationErrors?._errors,
      });
      reportIssue(id, 'UNUSED');
    }
    toast.success('Problema reportado con éxito');
    setLoading(id, false);
  };

  const submitCorrectedAmount = async (id: string) => {
    const val = parseFloat(redeemState.correctedAmount);
    if (isNaN(val)) {
      setRedeemState((prev) => ({
        ...prev,
        activeReportId: null,
        correctedAmount: '',
      }));
      return;
    }

    // Optimistic local update
    reportIssue(id, 'WRONG_AMOUNT', val);
    setRedeemState((prev) => ({
      ...prev,
      activeReportId: null,
      correctedAmount: '',
    }));

    if (!orderId) return;
    setLoading(id, true);
    const result = await reportGiftcardIssue({
      giftcardId: id,
      orderId,
      issueType: 'WRONG_AMOUNT',
      reportedAmount: val,
    });
    if (!result.data) {
      toast.error('Error al reportar el problema', {
        description: result.serverError || result.validationErrors?._errors,
      });
      reportIssue(id, 'UNUSED');
    }
    toast.success('Problema reportado con éxito');
    setLoading(id, false);
  };

  const handleUndoReport = async (giftcardId: string, status: BuyFlowGiftcardStatus) => {
    // Optimistic local update
    reportIssue(giftcardId, 'UNUSED');

    if (!orderId) return;
    setLoading(giftcardId, true);
    const result = await undoGiftcardIssue({ giftcardId, orderId });
    if (!result.data) {
      toast.error('Error al deshacer el problema de la tarjeta', {
        description: result.serverError || result.validationErrors?._errors,
      });
      // Retornar al status en el que estaba
      reportIssue(giftcardId, status);
    }
    toast.success('Problema deshecho con éxito');
    setLoading(giftcardId, false);
  };

  // Calculate totals based on status and apply buyRate
  const rawTotal = foundGiftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED') return sum + card.amount;
    if (card.status === 'WRONG_AMOUNT') return sum + (card.reportedAmount ?? 0);
    return sum; // INVALID, ALREADY_USED, DEACTIVATED = 0
  }, 0);

  const totalAmount = rawTotal * redeemState.buyRate;

  const reportedCount = foundGiftcards.filter((c) => c.status !== 'UNUSED').length;

  return (
    <div className="grid h-full grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
      {/* Left Column: Order Summary & Actions */}
      <Card className="border-border bg-card/50 sticky top-0 z-20 flex h-auto flex-col space-y-4 p-4 backdrop-blur-sm md:col-span-4 md:h-full md:space-y-6 md:p-6">
        <div>
          <h2 className="mb-0.5 text-xl font-bold md:mb-1 md:text-2xl">Redimir y Verificar</h2>
          <p className="text-muted-foreground text-xs md:text-sm">Copia tus códigos y reporta cualquier problema.</p>
        </div>

        <div className="space-y-4">
          <div className="border-border bg-muted/50 space-y-3 rounded-xl border p-3 md:p-4">
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="text-muted-foreground">Tarjetas Activas</span>
              <span className="font-bold">
                {foundGiftcards.length - reportedCount} / {foundGiftcards.length}
              </span>
            </div>

            <div className="border-border flex items-center justify-between border-t pt-2 text-sm md:text-base">
              <span className="text-muted-foreground">Total Ajustado</span>
              <div className="text-right">
                <span className="text-primary text-2xl font-black">${totalAmount.toFixed(2)}</span>
                <p className="text-muted-foreground mt-1 text-xs leading-none">Monto final a pagar</p>
              </div>
            </div>
          </div>

          {reportedCount > 0 && (
            <div className="border-destructive/20 bg-destructive/10 flex items-start gap-3 rounded-xl border p-3">
              <AlertTriangle className="text-destructive mt-0.5 h-4 w-4" />
              <p className="text-destructive/80 text-xs leading-relaxed font-medium md:text-sm">
                Has reportado problemas con {reportedCount} tarjeta
                {reportedCount !== 1 ? 's' : ''}. El total ha sido ajustado automáticamente.
              </p>
            </div>
          )}

          <div className="border-primary/20 bg-primary/5 flex items-start gap-3 rounded-xl border p-3">
            <Info className="text-primary mt-0.5 h-4 w-4" />
            <p className="text-muted-foreground text-xs leading-relaxed md:text-sm">
              Verifica cada tarjeta manualmente. Una vez que confirmes el uso, se desactivarán los reportes y se generará el pedido.
            </p>
          </div>
        </div>

        <div className="border-border mt-auto flex flex-col gap-3 border-t pt-4 md:pt-6">
          <Button
            onClick={() => setStep(4)}
            className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-10 w-full font-bold shadow-lg md:h-11"
          >
            He verificado todas las tarjetas <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="text-muted-foreground text-center text-xs italic">
            Asegúrate de que todos los reportes sean correctos antes de continuar.
          </p>
        </div>
      </Card>

      {/* Right Column: Cards Reveal & Reporting */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col p-4 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase md:text-sm">Códigos Revelados</Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/50 text-xs">{foundGiftcards.length} ítems</span>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <AnimatePresence>
            {foundGiftcards.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`relative rounded-xl border p-3 transition-all md:p-4 ${card.status === 'UNUSED' ? 'border-border bg-card/30' : 'border-destructive/30 bg-destructive/5 grayscale-[0.5]'} `}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-black ${card.status === 'UNUSED' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'} `}
                    >
                      #{idx + 1}
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xl font-black ${card.status === 'UNUSED' ? 'text-foreground' : 'text-muted-foreground line-through'}`}
                        >
                          ${card.amount}
                        </span>
                        {card.status !== 'UNUSED' && (
                          <Badge variant="destructive" className="h-4 py-0 text-xs font-bold uppercase">
                            {card.status === 'INVALID'
                              ? 'INVÁLIDA'
                              : card.status === 'ALREADY_USED'
                                ? 'YA USADA'
                                : card.status === 'DEACTIVATED'
                                  ? 'DESACTIVADA'
                                  : card.status === 'WRONG_AMOUNT'
                                    ? 'MONTO INCORRECTO'
                                    : card.status}
                            {card.status === 'WRONG_AMOUNT' && `: $${card.reportedAmount}`}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        {card.claimCode ? (
                          <div className="group border-border bg-muted/50 flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs font-bold md:text-sm">
                            {card.claimCode}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-primary h-4 w-4 transition-colors"
                              onClick={() => navigator.clipboard.writeText(card.claimCode!)}
                            >
                              <Clipboard className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 font-mono text-sm">CÓDIGO NO DISPONIBLE</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {redeemState.loadingIds.has(card.id) ? (
                      <Spinner className="text-muted-foreground" />
                    ) : card.status === 'UNUSED' ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive/30 text-destructive/80 hover:bg-destructive/10 h-8 text-xs"
                          >
                            Reportar problema
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-border bg-popover">
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => handleReport(card.id, 'INVALID')}
                          >
                            Código inválido
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => handleReport(card.id, 'ALREADY_USED')}
                          >
                            Ya usada
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => handleReport(card.id, 'DEACTIVATED')}
                          >
                            Desactivada
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReport(card.id, 'WRONG_AMOUNT')}>Monto incorrecto</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:bg-muted h-8 text-xs"
                        onClick={() => handleUndoReport(card.id, card.status)}
                      >
                        Deshacer reporte
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline form for WRONG_AMOUNT */}
                {redeemState.activeReportId === card.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="border-border mt-3 flex items-center gap-3 overflow-hidden border-t pt-3"
                  >
                    <div className="relative max-w-37.5 flex-1">
                      <span className="text-muted-foreground/50 absolute top-1.5 left-2 text-xs">$</span>
                      <Input
                        type="number"
                        placeholder="Monto corr."
                        value={redeemState.correctedAmount}
                        onChange={(e) =>
                          setRedeemState((prev) => ({
                            ...prev,
                            correctedAmount: e.target.value,
                          }))
                        }
                        className="border-border bg-muted/50 h-8 pl-5 text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground h-8 text-sm"
                      onClick={() => submitCorrectedAmount(card.id)}
                    >
                      Actualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setRedeemState((prev) => ({
                          ...prev,
                          activeReportId: null,
                          correctedAmount: '',
                        }))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
};
