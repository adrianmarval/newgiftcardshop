'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PromptDrawer } from '@/components/common';
import { showAlert } from '@/lib/ui';
import { giftcardIssueTypeConfig } from '@/lib/config';
import { reportIssue as reportIssueAction, attachIssueProof as attachIssueProofAction, getIssueProof as getIssueProofAction } from '@/actions/buyer/giftcards/issues';
import type { GiftcardIssueType } from '@/generated/prisma/enums';

// bodySizeLimit de server actions es 4mb — margen de seguridad para el payload
const MAX_PROOF_FILE_SIZE = 3.5 * 1024 * 1024;

interface CreateModeProps {
  mode: 'create';
  giftcardId: string;
  orderId: string;
  issueType: GiftcardIssueType;
}

interface AttachModeProps {
  mode: 'attach';
  issueId: string;
}

export type IssueProofDialogProps = (CreateModeProps | AttachModeProps) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se invoca tras un reporte/attach exitoso (el caller actualiza su store / invalida queries). */
  onSuccess: (reportedAmount?: number) => void;
  /** Si retorna true, el dialog NO muestra el alert de error (el caller lo maneja — ej. orden ya confirmada). */
  onActionError?: (errorMsg: string) => boolean;
};

/**
 * Form de reporte/evidencia sobre el shell adaptativo `PromptDrawer` (Drawer
 * bottom en mobile / Dialog centrado en desktop). Dos modos: `create` (wizard
 * de compra — reporta CON evidencia opcional vía reportIssue) y `attach`
 * (historial — adjunta/reemplaza la evidencia de un reporte existente vía
 * attachIssueProof). La captura es opcional pero recomendada: el proveedor
 * suele pedirla al revisar el reporte.
 */
export function IssueProofDialog(props: IssueProofDialogProps) {
  const { open, onOpenChange, onSuccess, onActionError } = props;
  const isCreate = props.mode === 'create';
  const issueType = isCreate ? props.issueType : null;
  const needsAmount = issueType === 'WRONG_AMOUNT';

  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Evidencia ya guardada (modo attach) — undefined = cargando, null = sin evidencia
  const [existingProof, setExistingProof] = useState<{ mimeType: string; base64: string } | null | undefined>(undefined);
  const [zooming, setZooming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset al abrir/cerrar + cleanup del object URL
  useEffect(() => {
    if (!open) {
      setAmount('');
      setFile(null);
      setExistingProof(undefined);
      setZooming(false);
    }
  }, [open]);

  // ESC para cerrar el zoom overlay
  useEffect(() => {
    if (!zooming) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZooming(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [zooming]);

  // En modo attach, cargar la evidencia actual para que el buyer vea qué subió
  // antes de reemplazarla (lectura user-triggered al abrir el dialog).
  useEffect(() => {
    if (!open || isCreate) return;
    let cancelled = false;
    getIssueProofAction({ issueId: props.issueId }).then((result) => {
      if (!cancelled) setExistingProof(result.data?.proof ?? null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props.issueId es estable por instancia del dialog
  }, [open, isCreate]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.type.startsWith('image/')) {
      showAlert.toast.error('El archivo debe ser una imagen');
      e.target.value = '';
      return;
    }
    if (selected.size > MAX_PROOF_FILE_SIZE) {
      showAlert.toast.error('La captura es demasiado pesada (máx. 3.5MB)');
      e.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    let reportedAmount: number | undefined;
    if (needsAmount) {
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) {
        showAlert.toast.error('Ingresá el monto real de la tarjeta');
        return;
      }
      reportedAmount = val;
    }

    setSubmitting(true);
    try {
      if (isCreate) {
        const result = await reportIssueAction({
          giftcardId: props.giftcardId,
          orderId: props.orderId,
          issueType: props.issueType,
          reportedAmount,
          proofFile: file ?? undefined,
        });
        if (!result.data) {
          const errorMsg = result.serverError || result.validationErrors?._errors?.join('') || 'Error al reportar el problema';
          if (onActionError?.(errorMsg)) return;
          showAlert.error('Error', errorMsg);
          return;
        }
        showAlert.toast.success('Problema reportado con éxito');
      } else {
        const result = await attachIssueProofAction({ issueId: props.issueId, file: file! });
        if (!result.data) {
          showAlert.error('Error', result.serverError || result.validationErrors?._errors?.join('') || 'Error al adjuntar la evidencia');
          return;
        }
        showAlert.toast.success('Evidencia adjuntada con éxito');
      }
      onOpenChange(false);
      onSuccess(reportedAmount);
    } finally {
      setSubmitting(false);
    }
  };

  // En attach la evidencia es obligatoria (es el único propósito del dialog)
  const canSubmit = !submitting && (isCreate || file !== null);

  return (
    <PromptDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={isCreate ? 'Reportar problema' : 'Adjuntar evidencia'}
      description={
        isCreate ? (
          <span className="flex flex-col items-center gap-2">
            {issueType && (
              <Badge variant="outline" className={giftcardIssueTypeConfig[issueType].color}>
                {giftcardIssueTypeConfig[issueType].label}
              </Badge>
            )}
            La captura de pantalla es opcional pero recomendada: el proveedor suele pedirla al revisar el reporte.
          </span>
        ) : (
          'Subí una captura de pantalla del error o del balance. Si ya había una evidencia, se reemplaza.'
        )
      }
      primaryAction={{
        label: isCreate ? 'Reportar' : 'Adjuntar',
        onClick: handleSubmit,
        loading: submitting,
        disabled: !canSubmit,
      }}
      secondaryAction={{ label: 'Cancelar', onClick: () => onOpenChange(false) }}
    >
      <div className="space-y-3">
        {needsAmount && (
          <div className="relative">
            <span className="text-muted-foreground/50 absolute top-2.5 left-3 text-sm">$</span>
            <Input
              type="number"
              placeholder="Monto real de la tarjeta"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-7"
              autoFocus
            />
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {previewUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview local de un File (object URL), no optimizable */}
            <img
              src={previewUrl}
              alt="Vista previa de la evidencia"
              className="border-border max-h-48 w-full cursor-zoom-in rounded-lg border object-contain"
              onClick={() => setZooming(true)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="bg-background/80 absolute top-2 right-2 h-7 w-7 rounded-full"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : existingProof ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL de evidencia ya cifrada en DB, no optimizable */}
            <img
              src={`data:${existingProof.mimeType};base64,${existingProof.base64}`}
              alt="Evidencia actual"
              className="border-border max-h-48 w-full cursor-zoom-in rounded-lg border object-contain"
              onClick={() => setZooming(true)}
            />
            <Button type="button" variant="outline" className="w-full gap-2 border-dashed" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />
              Reemplazar captura
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={existingProof === undefined && !isCreate}
          >
            <ImagePlus className="h-4 w-4" />
            {isCreate
              ? 'Adjuntar captura (opcional)'
              : existingProof === undefined
                ? 'Cargando evidencia actual…'
                : 'Seleccionar captura'}
          </Button>
        )}
      </div>

      {/* Full-screen zoom overlay */}
      {zooming && (previewUrl || existingProof) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZooming(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- full-screen zoom, no optimizable */}
          <img
            src={previewUrl ?? `data:${existingProof!.mimeType};base64,${existingProof!.base64}`}
            alt="Imagen ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/20 text-white hover:bg-white/30"
            onClick={() => setZooming(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}
    </PromptDrawer>
  );
}
