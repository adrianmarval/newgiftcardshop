'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptDrawer } from '@/components/common';
import { showAlert } from '@/lib/ui';
import { attachProvenanceImage as attachProvenanceImageAction, getProvenanceImage as getProvenanceImageAction } from '@/actions/seller/batches';

// bodySizeLimit de server actions es 4mb — margen de seguridad para el payload
const MAX_IMAGE_FILE_SIZE = 3.5 * 1024 * 1024;

export interface ProvenanceImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Card que recibe la imagen (null = dialog cerrado/sin target). */
  giftcardId: string | null;
  /** Si ya tiene imagen, el copy avisa que se reemplaza. */
  hasExistingImage?: boolean;
  /** Se invoca tras un attach exitoso (el caller invalida sus queries). */
  onSuccess?: () => void;
}

/**
 * Attach tardío de imagen de procedencia desde el historial de lotes del
 * seller, sobre el shell adaptativo `PromptDrawer` (Drawer bottom en mobile /
 * Dialog centrado en desktop). Espejo de IssueProofDialog del buyer: una sola
 * imagen por card, re-subir reemplaza la anterior, sin guarda de estado del
 * batch (la evidencia puede hacer falta post-pago en una disputa).
 */
export function ProvenanceImageDialog({ open, onOpenChange, giftcardId, hasExistingImage = false, onSuccess }: ProvenanceImageDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Imagen ya guardada — undefined = cargando, null = sin imagen
  const [existingImage, setExistingImage] = useState<{ mimeType: string; base64: string } | null | undefined>(undefined);
  const [zooming, setZooming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset al abrir/cerrar + cleanup del object URL
  useEffect(() => {
    if (!open) {
      setFile(null);
      setExistingImage(undefined);
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

  // Si la card ya tiene imagen, cargarla para que el seller vea qué subió
  // antes de reemplazarla (lectura user-triggered al abrir el dialog).
  useEffect(() => {
    if (!open || !giftcardId || !hasExistingImage) return;
    let cancelled = false;
    getProvenanceImageAction({ giftcardId }).then((result) => {
      if (!cancelled) setExistingImage(result.data?.image ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, giftcardId, hasExistingImage]);

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
      showAlert.toast.error('The file must be an image');
      e.target.value = '';
      return;
    }
    if (selected.size > MAX_IMAGE_FILE_SIZE) {
      showAlert.toast.error('The image is too heavy (max 3.5MB)');
      e.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (submitting || !giftcardId || !file) return;

    setSubmitting(true);
    try {
      const result = await attachProvenanceImageAction({ giftcardId, file });
      if (!result.data) {
        showAlert.error('Error', result.serverError || result.validationErrors?._errors?.join('') || 'Failed to attach the image');
        return;
      }
      showAlert.toast.success('Provenance image attached');
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PromptDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={hasExistingImage ? 'Replace provenance image' : 'Add provenance image'}
      description={
        hasExistingImage
          ? 'This card already has a provenance image — uploading a new one replaces it.'
          : 'Upload a screenshot showing where this card came from. The admin uses it to verify provenance if there is a dispute.'
      }
      primaryAction={{ label: 'Attach', onClick: handleSubmit, loading: submitting, disabled: !file }}
      secondaryAction={{ label: 'Cancel', onClick: () => onOpenChange(false) }}
    >
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {previewUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- preview local de un File (object URL), no optimizable */}
          <img
            src={previewUrl}
            alt="Provenance image preview"
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
      ) : existingImage ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL de imagen ya cifrada en DB, no optimizable */}
          <img
            src={`data:${existingImage.mimeType};base64,${existingImage.base64}`}
            alt="Current provenance image"
            className="border-border max-h-48 w-full cursor-zoom-in rounded-lg border object-contain"
            onClick={() => setZooming(true)}
          />
          <Button type="button" variant="outline" className="w-full gap-2 border-dashed" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            Replace screenshot
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={hasExistingImage && existingImage === undefined}
        >
          <ImagePlus className="h-4 w-4" />
          {hasExistingImage && existingImage === undefined ? 'Loading current image…' : 'Select screenshot'}
        </Button>
      )}

      {/* Full-screen zoom overlay */}
      {zooming && (previewUrl || existingImage) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZooming(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- full-screen zoom, no optimizable */}
          <img
            src={previewUrl ?? `data:${existingImage!.mimeType};base64,${existingImage!.base64}`}
            alt="Image enlarged"
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
