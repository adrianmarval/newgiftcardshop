'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, ClipboardCheck, ChevronRight, X, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBuyFlow } from '@/hooks/use-buy-flow';
import { getUserBuyRate } from '@/actions/buyer/orders/get-user-buy-rate';
import { reportIssue as reportIssueAction } from '@/actions/buyer/giftcards/issues/report-issue';
import { undoIssue as undoIssueAction } from '@/actions/buyer/giftcards/issues/undo-issue';
import { GiftcardIssueType, GiftcardStatus } from '@/generated/prisma/enums';
import { showAlert } from '@/lib/swal';
import { Spinner } from '@/components/ui/spinner';
import { useAction } from 'next-safe-action/hooks';
import { formatCurrency } from '@/lib/currency-formatter';
import { copyToClipboard } from '@/lib/clipboard';
import { BuyStepsProgress } from '@/components/buy/steps/buy-steps-progress';

export const RedeemStep = () => {
  const { foundGiftcards, reportIssue, setStep, orderId, selectedBrand, selectedCountry, selectedCurrency } = useBuyFlow();

  const [redeemState, setRedeemState] = useState<{
    activeReportId: string | null;
    correctedAmount: string;
    buyRate: number;
    loadingIds: Set<string>;
    copiedIds: Set<string>;
  }>({
    activeReportId: null,
    correctedAmount: '',
    buyRate: 0,
    loadingIds: new Set<string>(),
    copiedIds: new Set<string>(),
  });

  const { execute: executeGetUserBuyRate } = useAction(getUserBuyRate, {
    onSuccess: ({ data }) => {
      if (data?.success && typeof data.rate === 'number') {
        setRedeemState((prev) => ({ ...prev, buyRate: data.rate }));
      }
    },
    onError: ({ error }) => {
      showAlert.error('Sin tarifa', error.serverError || 'No tienes tarifa asignada para esta marca y país. Contactá al administrador.');
    },
  });

  useEffect(() => {
    if (selectedBrand.includes('|')) {
      const [brandId, countryId] = selectedBrand.split('|');
      executeGetUserBuyRate({ brandId, countryId });
    } else if (selectedBrand) {
      executeGetUserBuyRate({ brandCountryId: selectedBrand });
    }
  }, [executeGetUserBuyRate, selectedBrand, selectedCountry]);

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
    const result = await reportIssueAction({
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
    const result = await reportIssueAction({
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

  const handleUndoReport = async (giftcardId: string, status: GiftcardStatus) => {
    // Optimistic local update
    reportIssue(giftcardId, 'UNUSED');

    if (!orderId) return;
    setLoading(giftcardId, true);
    const result = await undoIssueAction({ giftcardId, orderId });
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
    showAlert.toast.success('Código copiado');
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
    <div className="flex h-full min-h-0 flex-col gap-1">
      <BuyStepsProgress />

      <div className="flex min-h-0 flex-1 flex-col gap-1 md:grid md:grid-cols-12 md:gap-1">
        {/* Left Column: Order Summary & Actions */}
        <Card className="flex min-h-0 shrink-0 flex-col gap-1 border p-2 backdrop-blur-sm md:col-span-4 md:gap-1 md:p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold md:text-lg">Redimir y Verificar</h2>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Monto en Giftcards</span>
              <span className="font-bold">{formatCurrency(rawTotal, { currency: selectedCurrency })}</span>
            </div>
            <div className="border-border flex items-center justify-between border-t pt-1.5 text-xs">
              <span className="text-muted-foreground">Monto a pagar</span>
              <div className="flex flex-col text-right">
                <span className="text-primary text-lg font-black md:text-xl">{formatCurrency(totalAmount, { currency: 'USD' })}</span>
                <span className="text-muted-foreground text-[10px] md:text-xs">Rate ({(redeemState.buyRate * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column: Cards Reveal & Reporting */}
        <Card className="flex min-h-0 flex-1 flex-col gap-0 border backdrop-blur-sm md:col-span-8">
          <CardHeader className="flex items-center justify-between px-2 py-2 md:px-3 md:py-2">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase md:text-xs">Códigos Revelados</span>
            <div className="flex items-center gap-1.5">
              {copiedCount > 0 && (
                <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-500 md:text-xs">
                  <ClipboardCheck className="h-3 w-3" />
                  {copiedCount}/{totalCards} copiadas
                </Badge>
              )}
              <span className="text-muted-foreground/50 text-[10px] md:text-xs">{foundGiftcards.length} ítems</span>
            </div>
          </CardHeader>

          <CardContent className="custom-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto px-1 py-1 md:space-y-1 md:px-2 md:py-2">
            <AnimatePresence>
              {foundGiftcards.map((card, idx) => {
                const isCopied = redeemState.copiedIds.has(card.id);

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`relative rounded-xl border p-1.5 transition-all md:p-3 ${
                      card.status !== 'UNUSED'
                        ? 'border-destructive/30 bg-destructive/5 grayscale-[0.5]'
                        : isCopied
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-border bg-card/30'
                    } `}
                  >
                    <div className="flex flex-row items-center justify-between gap-1">
                      <div className="flex items-center gap-1 md:gap-1">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-lg text-[9px] font-black md:h-9 md:w-9 md:text-xs ${
                            card.status !== 'UNUSED'
                              ? 'bg-muted text-muted-foreground'
                              : isCopied
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : 'bg-primary/20 text-primary'
                          } `}
                        >
                          {isCopied ? <ClipboardCheck className="h-3 w-3 md:h-3.5 md:w-3.5" /> : `#${idx + 1}`}
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-base font-black md:text-lg ${card.status === 'UNUSED' ? 'text-foreground' : 'text-muted-foreground line-through'}`}
                            >
                              {formatCurrency(card.amount, { currency: selectedCurrency })}
                            </span>
                            {card.status === 'WRONG_AMOUNT' && card.reportedAmount !== undefined && (
                              <span className="text-destructive text-base font-black md:text-lg">
                                {formatCurrency(card.reportedAmount, { currency: selectedCurrency })}
                              </span>
                            )}
                            {card.status !== 'UNUSED' && (
                              <Badge variant="destructive" className="h-4 px-1.5 py-0 text-[9px] font-bold uppercase md:text-[10px]">
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
                          <div className="mt-0.5 flex items-center gap-1">
                            {card.claimCode ? (
                              <div
                                className={`group flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold md:text-sm ${
                                  isCopied ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border bg-muted/50'
                                }`}
                                onClick={() => handleCopy(card.id, card.claimCode!)}
                              >
                                {card.claimCode}
                                <span
                                  className={`transition-colors ${isCopied ? 'text-emerald-500' : 'text-muted-foreground group-hover:text-primary'}`}
                                >
                                  {isCopied ? (
                                    <ClipboardCheck className="h-2 w-2 md:h-2.5 md:w-2.5" />
                                  ) : (
                                    <Clipboard className="h-2 w-2 md:h-2.5 md:w-2.5" />
                                  )}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30 font-mono text-[8px]">NO DISP.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {redeemState.loadingIds.has(card.id) ? (
                          <Spinner size="sm" className="text-muted-foreground" />
                        ) : card.status === 'UNUSED' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-destructive/30 text-destructive/80 hover:bg-destructive/10 h-6 px-1.5 text-[9px] md:h-7 md:px-2 md:text-[10px]"
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
                            className="text-muted-foreground hover:bg-muted h-6 px-1.5 text-[9px] md:h-7 md:px-2 md:text-[10px]"
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
                        className="border-border mt-2 flex items-center gap-1 overflow-hidden border-t pt-2"
                      >
                        <div className="relative max-w-32 flex-1">
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
                            className="border-border bg-muted/50 h-7 pl-5 text-xs md:h-8"
                          />
                        </div>
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground h-7 text-xs md:h-8 md:text-sm"
                          onClick={() => submitCorrectedAmount(card.id)}
                        >
                          Actualizar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 md:h-8"
                          onClick={() =>
                            setRedeemState((prev) => ({
                              ...prev,
                              activeReportId: null,
                              correctedAmount: '',
                            }))
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-center-safe gap-1">
        <Button
          onClick={() => setStep(4)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs font-bold md:h-10 md:text-sm"
        >
          Confirmar uso/reportes <ChevronRight className="ml-1 h-3 w-3 md:ml-2 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  );
};
