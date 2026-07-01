'use client';

import React, { useState, useMemo } from 'react';
import { useAction } from 'next-safe-action/hooks';
import JSZip from 'jszip';
import { Image as ImageIcon, Download, Loader2, X, Link, Unlink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { getBatchImages, linkImageToCard, unlinkImageFromCard } from '@/actions/admin/batches';
import { showAlert } from '@/lib/ui';
import type { Giftcard } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface AdminBatchGalleryProps {
  batchId: string;
  giftcards: Giftcard[];
}

interface GalleryImage {
  id: string;
  mimeType: string;
  base64: string;
  giftcardId: string | null;
}

export function AdminBatchGallery({ batchId, giftcards }: AdminBatchGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { execute: fetchImages, status: fetchStatus } = useAction(getBatchImages, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        setImages(data.images);
        if (data.images.length === 0) {
          showAlert.toast.info('Sin imágenes', 'Este lote no tiene evidencia adjunta.');
        }
      }
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || 'No se pudieron cargar las imágenes del lote.');
    },
  });

  const [pendingLink, setPendingLink] = useState<{ imageId: string; giftcardId: string } | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<string | null>(null);

  const { execute: executeLink, status: linkStatus } = useAction(linkImageToCard, {
    onSuccess: ({ data }) => {
      if (data?.success && pendingLink) {
        setImages((prev) => prev.map((img) => (img.id === pendingLink.imageId ? { ...img, giftcardId: pendingLink.giftcardId } : img)));
        showAlert.toast.success('Imagen vinculada');
      } else {
        showAlert.error('Error', data?.error || 'No se pudo vincular');
      }
      setPendingLink(null);
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || 'No se pudo vincular');
      setPendingLink(null);
    },
  });

  const { execute: executeUnlink, status: unlinkStatus } = useAction(unlinkImageFromCard, {
    onSuccess: ({ data }) => {
      if (data?.success && pendingUnlink) {
        setImages((prev) => prev.map((img) => (img.id === pendingUnlink ? { ...img, giftcardId: null } : img)));
        showAlert.toast.success('Imagen desvinculada');
      } else {
        showAlert.error('Error', data?.error || 'No se pudo desvincular');
      }
      setPendingUnlink(null);
    },
    onError: ({ error }) => {
      showAlert.error('Error', error.serverError || 'No se pudo desvincular');
      setPendingUnlink(null);
    },
  });

  const cardMap = useMemo(() => {
    const map = new Map<string, Giftcard>();
    for (const card of giftcards) map.set(card.id, card);
    return map;
  }, [giftcards]);

  const linkedImageIds = useMemo(() => new Set(images.filter((img) => img.giftcardId).map((img) => img.giftcardId)), [images]);

  const availableCards = useMemo(() => giftcards.filter((card) => !linkedImageIds.has(card.id)), [giftcards, linkedImageIds]);

  const linkedCount = images.filter((img) => img.giftcardId).length;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && images.length === 0 && fetchStatus === 'idle') {
      fetchImages({ batchId });
    }
    if (!open) {
      setSelectedImage(null);
    }
  };

  const handleLink = (imageId: string, giftcardId: string) => {
    setPendingLink({ imageId, giftcardId });
    executeLink({ imageId, giftcardId });
  };

  const handleUnlink = (imageId: string) => {
    setPendingUnlink(imageId);
    executeUnlink({ imageId });
  };

  const handleDownloadZip = async () => {
    if (images.length === 0) return;
    try {
      setIsZipping(true);
      const zip = new JSZip();
      images.forEach((img, index) => {
        const ext = img.mimeType === 'image/png' ? 'png' : 'jpg';
        zip.file(`batch-${batchId}-evidence-${index + 1}.${ext}`, img.base64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-${batchId}-evidence.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showAlert.error('Error', 'Hubo un problema al generar el archivo ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  const isLoading = fetchStatus === 'executing';
  const isMutating = linkStatus === 'executing' || unlinkStatus === 'executing';
  const hasImages = images.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <ImageIcon className="h-3.5 w-3.5" />
          Ver Evidencia
          {linkedCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {linkedCount}/{images.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="border-border bg-card flex h-[95vh] max-h-[95vh] max-w-[95vw] flex-col overflow-hidden p-0 md:h-[85vh] md:max-w-5xl lg:max-w-7xl">
        <DialogHeader className="border-b p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Evidencia del Lote #{batchId}</DialogTitle>
              <DialogDescription>
                {linkedCount > 0
                  ? `${linkedCount} de ${images.length} imagen(es) vinculada(s) a tarjetas`
                  : 'Imágenes provistas por el seller durante la publicación'}
              </DialogDescription>
            </div>
            {hasImages && (
              <Button onClick={handleDownloadZip} disabled={isZipping} variant="default" size="sm" className="gap-1">
                {isZipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isZipping ? 'Comprimiendo...' : 'Descargar ZIP'}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="bg-muted/10 flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-6 py-12">
              <Loader2 className="text-primary mb-2 h-8 w-8 animate-spin" />
              <p>Descifrando imágenes...</p>
            </div>
          ) : !hasImages ? (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-6 py-12">
              <ImageIcon className="mb-2 h-12 w-12 opacity-20" />
              <p>No se encontró evidencia para este lote.</p>
            </div>
          ) : selectedImage ? (
            <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-black/80 p-4 md:p-8">
              <Button
                variant="secondary"
                size="icon"
                className="bg-background/50 hover:bg-background absolute top-4 right-4 z-10 rounded-full shadow-lg"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${images.find((img) => img.id === selectedImage)?.mimeType || 'image/jpeg'};base64,${images.find((img) => img.id === selectedImage)?.base64}`}
                alt="Evidencia ampliada"
                className="max-h-full max-w-full object-contain shadow-2xl"
              />
            </div>
          ) : (
            <div className="custom-scrollbar h-full flex-1 overflow-y-auto p-4 md:p-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
                {images.map((img) => {
                  const linkedCard = img.giftcardId ? cardMap.get(img.giftcardId) : null;

                  return (
                    <div
                      key={img.id}
                      className="group bg-muted/20 hover:border-primary relative aspect-3/4 cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`}
                        alt={`Evidencia ${img.id}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        onClick={() => setSelectedImage(img.id)}
                      />

                      {/* Linking overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
                        {linkedCard ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <Badge className="bg-emerald-500/20 text-emerald-300 mb-1 border-0 px-1.5 py-0.5 text-[9px] font-bold">
                                <Check className="mr-0.5 h-2.5 w-2.5" />
                                Vinculada
                              </Badge>
                              <p className="truncate text-[11px] font-bold text-white">{linkedCard.claimCode}</p>
                              <p className="text-[10px] text-white/60">
                                {formatCurrency(Number(linkedCard.amount), { currency: linkedCard.country?.currency || 'USD' })}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={isMutating}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlink(img.id);
                              }}
                              className="h-7 w-7 shrink-0 rounded-full bg-white/10 text-white hover:bg-red-500/30 hover:text-red-300"
                            >
                              <Unlink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isMutating}
                                  className="w-full gap-1.5 rounded-lg bg-white/10 text-[11px] font-bold text-white hover:bg-white/20"
                                >
                                  <Link className="h-3.5 w-3.5" />
                                  Vincular a tarjeta
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-64 max-h-64 overflow-y-auto">
                                {availableCards.length === 0 ? (
                                  <div className="text-muted-foreground p-2 text-center text-xs">
                                    Todas las tarjetas ya tienen imagen
                                  </div>
                                ) : (
                                  availableCards.map((card) => (
                                    <DropdownMenuItem
                                      key={card.id}
                                      onClick={() => handleLink(img.id, card.id)}
                                      className="flex flex-col items-start gap-0.5"
                                    >
                                      <span className="text-xs font-bold">{card.claimCode}</span>
                                      <span className="text-muted-foreground text-[10px]">
                                        {formatCurrency(Number(card.amount), { currency: card.country?.currency || 'USD' })}
                                      </span>
                                    </DropdownMenuItem>
                                  ))
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      <div
                        className="absolute inset-0 flex items-end justify-center bg-linear-to-t from-black/60 via-black/0 to-transparent pb-4 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => setSelectedImage(img.id)}
                      >
                        <span className="bg-background/90 text-foreground rounded-full px-4 py-2 text-xs font-bold tracking-widest uppercase shadow-lg backdrop-blur-md">
                          Ampliar
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
