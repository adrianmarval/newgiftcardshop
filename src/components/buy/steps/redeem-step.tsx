'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, ClipboardCheck, AlertTriangle, ChevronRight, X, Info } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { getUserBuyRate } from '@/actions/order/get-user-buy-rate';
import { reportGiftcardIssue, undoGiftcardIssue } from '@/actions/giftcard/issues';
import { GiftcardIssueType } from '@/generated/prisma/enums';
import { BuyFlowGiftcardStatus } from '@/types';
import { showAlert } from '@/lib/swal';
import { Spinner } from '@/components/ui/spinner';
import { useAction } from 'next-safe-action/hooks';
import { formatCurrency } from '@/lib/currency-formatter';
import { copyToClipboard } from '@/lib/clipboard';

export const RedeemStep = () => {
  const { foundGiftcards, reportIssue, setStep, orderId } = useBuyFlow();

  const [redeemState, setRedeemState] = useState<{
    activeReportId: string | null;
    correctedAmount: string;
    buyRate: number;
    loadingIds: Set<string>;
    copiedIds: Set<string>;
  }>({
    activeReportId: null,
    correctedAmount: '',
    buyRate: 0.85,
    loadingIds: new Set<string>(),
    copiedIds: new Set<string>(),
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
      showAlert.error('Error', result.serverError || result.validationErrors?._errors?.join('') || 'Error al reportar el problema');
      reportIssue(id, 'UNUSED');
    } else {
      showAlert.toast.success('Problema reportado con éxito');
    }
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
      showAlert.error('Error', result.serverError || result.validationErrors?._errors?.join('') || 'Error al reportar el problema');
      reportIssue(id, 'UNUSED');
    } else {
      showAlert.toast.success('Problema reportado con éxito');
    }
    setLoading(id, false);
  };

  const handleUndoReport = async (giftcardId: string, status: BuyFlowGiftcardStatus) => {
    // Optimistic local update
    reportIssue(giftcardId, 'UNUSED');

    if (!orderId) return;
    setLoading(giftcardId, true);
    const result = await undoGiftcardIssue({ giftcardId, orderId });
    if (!result.data) {
      showAlert.error('Error', result.serverError || result.validationErrors?._errors?.join('') || 'Error al deshacer el problema');
      // Retornar al status en el que estaba
      reportIssue(giftcardId, status);
    } else {
      showAlert.toast.success('Problema deshecho con éxito');
    }
    setLoading(giftcardId, false);
  };

  const handleCopy = (cardId: string, claimCode: string) => {
    copyToClipboard(claimCode);
    setRedeemState((prev) => {
      const next = new Set(prev.copiedIds);
      next.add(cardId);
      return { ...prev, copiedIds: next };
    });
  };

  // Calculate totals based on status and apply buyRate
  const rawTotal = foundGiftcards.reduce((sum, card) => {
    if (card.status === 'UNUSED') return sum + card.amount;
    if (card.status === 'WRONG_AMOUNT') return sum + (card.reportedAmount ?? 0);
    return sum; // INVALID, ALREADY_USED, DEACTIVATED = 0
  }, 0);

  const totalAmount = rawTotal * redeemState.buyRate;

  // Clipboard progress tracking
  const copiedCount = redeemState.copiedIds.size;
  const totalCards = foundGiftcards.length;

  return (
    <div className="grid grid-cols-1 items-start gap-2 md:h-full md:grid-cols-12 md:gap-6">
      {/* Left Column: Order Summary & Actions */}
      <Card className="border-border bg-card/50 flex h-auto flex-col gap-1 space-y-2 p-2 backdrop-blur-sm md:col-span-4 md:h-full md:space-y-6 md:p-6">
        <div>
          <h2 className="mb-0.5 text-xl font-bold md:mb-1 md:text-2xl">Redimir y Verificar</h2>
          <p className="text-muted-foreground text-xs md:text-sm">Copia tus códigos y reporta cualquier problema.</p>
        </div>

        <div className="space-y-2 md:space-y-4">
          <div className="border-border bg-muted/50 space-y-2 rounded-xl border p-2 md:p-4">
            <div className="text-md flex items-center justify-between md:text-base">
              <span className="text-muted-foreground">Monto en Giftcards</span>
              <span className="font-bold">
                {formatCurrency(rawTotal, { currency: (foundGiftcards[0] as any)?.country?.currency || 'USD' })}
              </span>
            </div>

            <div className="border-border text-md flex items-center justify-between border-t pt-1.5 md:text-base">
              <span className="text-muted-foreground">Monto a pagar</span>
              <div className="flex flex-col text-right">
                <span className="text-primary text-xl font-black md:text-2xl">{formatCurrency(totalAmount, { currency: 'USD' })}</span>
                {/* show buyerRate */}
                <span className="text-muted-foreground text-[10px] md:text-sm">Rate ({(redeemState.buyRate * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          <div className="border-primary/20 bg-primary/5 hidden items-start gap-2 rounded-xl border p-2 md:flex">
            <Info className="text-primary mt-0.5 h-3.5 w-3.5" />
            <p className="text-muted-foreground text-[10px] leading-relaxed md:text-sm">
              Verifica cada tarjeta manualmente. Una vez que confirmes el uso, se generará el pedido.
            </p>
          </div>
        </div>
      </Card>

      {/* Right Column: Cards Reveal & Reporting */}
      <Card className="border-border bg-card/50 flex min-h-100 flex-col gap-1 backdrop-blur-sm md:col-span-8 md:min-h-125 md:p-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase md:text-sm">Códigos Revelados</Label>
            <div className="flex items-center gap-1.5 md:gap-2">
              {copiedCount > 0 && (
                <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-500 md:text-xs">
                  <ClipboardCheck className="h-3 w-3" />
                  {copiedCount}/{totalCards} copiadas
                </Badge>
              )}
              <span className="text-muted-foreground/50 text-xs">{foundGiftcards.length} ítems</span>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-1.5 px-1 md:space-y-4">
          <AnimatePresence>
            {foundGiftcards.map((card, idx) => {
              const isCopied = redeemState.copiedIds.has(card.id);

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`relative rounded-xl border p-2 transition-all md:p-4 ${
                    card.status !== 'UNUSED'
                      ? 'border-destructive/30 bg-destructive/5 grayscale-[0.5]'
                      : isCopied
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-border bg-card/30'
                  } `}
                >
                  <div className="flex flex-row items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black md:h-10 md:w-10 md:text-xs ${
                          card.status !== 'UNUSED'
                            ? 'bg-muted text-muted-foreground'
                            : isCopied
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : 'bg-primary/20 text-primary'
                        } `}
                      >
                        {isCopied ? <ClipboardCheck className="h-3.5 w-3.5 md:h-4 md:w-4" /> : `#${idx + 1}`}
                      </div>

                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-lg font-black md:text-xl ${card.status === 'UNUSED' ? 'text-foreground' : 'text-muted-foreground line-through'}`}
                          >
                            {formatCurrency(card.amount, { currency: (card as any).country?.currency || 'USD' })}
                          </span>
                          {card.status === 'WRONG_AMOUNT' && card.reportedAmount !== undefined && (
                            <span className="text-destructive text-lg font-black md:text-xl">
                              {formatCurrency(card.reportedAmount, { currency: (card as any).country?.currency || 'USD' })}
                            </span>
                          )}
                          {card.status !== 'UNUSED' && (
                            <Badge variant="destructive" className="h-4 px-1.5 py-0 text-[10px] font-bold uppercase md:text-xs">
                              {card.status === 'INVALID'
                                ? 'INV.'
                                : card.status === 'ALREADY_USED'
                                  ? 'USADA'
                                  : card.status === 'DEACTIVATED'
                                    ? 'DESACT.'
                                    : card.status === 'WRONG_AMOUNT'
                                      ? 'MONTO'
                                      : 'ERROR'}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          {card.claimCode ? (
                            <div
                              className={`group text-md flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono font-bold md:text-sm ${
                                isCopied ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border bg-muted/50'
                              }`}
                            >
                              {card.claimCode}
                              <Button
                                size="icon"
                                variant="ghost"
                                className={`h-3.5 w-3.5 transition-colors ${
                                  isCopied ? 'text-emerald-500' : 'text-muted-foreground hover:text-primary'
                                }`}
                                onClick={() => handleCopy(card.id, card.claimCode!)}
                              >
                                {isCopied ? <ClipboardCheck className="h-2.5 w-2.5" /> : <Clipboard className="h-2.5 w-2.5" />}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/30 font-mono text-[9px]">NO DISP.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {redeemState.loadingIds.has(card.id) ? (
                        <Spinner size="sm" className="text-muted-foreground" />
                      ) : card.status === 'UNUSED' ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-destructive/30 text-destructive/80 hover:bg-destructive/10 h-7 px-2 text-[10px]"
                            >
                              Reportar
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-border bg-popover">
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive text-xs"
                              onClick={() => handleReport(card.id, 'INVALID')}
                            >
                              Código inválido
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive text-xs"
                              onClick={() => handleReport(card.id, 'ALREADY_USED')}
                            >
                              Ya usada
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive text-xs"
                              onClick={() => handleReport(card.id, 'DEACTIVATED')}
                            >
                              Desactivada
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs" onClick={() => handleReport(card.id, 'WRONG_AMOUNT')}>
                              Monto incorrecto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:bg-muted h-7 px-2 text-[10px]"
                          onClick={() => handleUndoReport(card.id, card.status)}
                        >
                          Deshacer
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
              );
            })}
          </AnimatePresence>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => setStep(4)}
            className="bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90 h-9 w-full text-xs font-bold shadow-lg md:h-11 md:text-base"
          >
            Confirmar uso/reportes <ChevronRight className="ml-1 h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
