'use client';

import React, { useState } from 'react';
import { useAction } from 'next-safe-action/hooks';
import JSZip from 'jszip';
import { Image as ImageIcon, Download, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getBatchImages } from '@/actions/admin/batches';
import { showAlert } from '@/lib/swal';

interface AdminBatchGalleryProps {
  batchId: string;
}

export function AdminBatchGallery({ batchId }: AdminBatchGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<Array<{ id: string; mimeType: string; base64: string }>>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { execute, status } = useAction(getBatchImages, {
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && images.length === 0 && status === 'idle') {
      execute({ batchId });
    }
    if (!open) {
      setSelectedImage(null);
    }
  };

  const handleDownloadZip = async () => {
    if (images.length === 0) return;
    try {
      setIsZipping(true);
      const zip = new JSZip();

      images.forEach((img, index) => {
        // determine extension from mimeType
        const ext = img.mimeType === 'image/png' ? 'png' : 'jpg';
        zip.file(`batch-${batchId}-evidence-${index + 1}.${ext}`, img.base64, { base64: true });
      });

      const blob = await zip.generateAsync({ type: 'blob' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-${batchId}-evidence.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating ZIP:', error);
      showAlert.error('Error', 'Hubo un problema al generar el archivo ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  const isLoading = status === 'executing';
  const hasImages = images.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <ImageIcon className="h-3.5 w-3.5" />
          Ver Evidencia
        </Button>
      </DialogTrigger>

      <DialogContent className="border-border bg-card flex h-[95vh] max-h-[95vh] max-w-[95vw] flex-col overflow-hidden p-0 md:h-[85vh] md:max-w-5xl lg:max-w-7xl">
        <DialogHeader className="border-b p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Evidencia del Lote #{batchId}</DialogTitle>
              <DialogDescription>Imágenes provistas por el seller durante la publicación.</DialogDescription>
            </div>
            {hasImages && (
              <Button onClick={handleDownloadZip} disabled={isZipping} variant="default" size="sm" className="gap-2">
                {isZipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isZipping ? 'Comprimiendo...' : 'Descargar ZIP'}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="bg-muted/10 flex flex-1 flex-col overflow-hidden">
          {isLoading ? (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-6 py-12">
              <Loader2 className="text-primary mb-4 h-8 w-8 animate-spin" />
              <p>Descifrando imágenes...</p>
            </div>
          ) : !hasImages ? (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center p-6 py-12">
              <ImageIcon className="mb-4 h-12 w-12 opacity-20" />
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
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="group bg-muted/20 hover:border-primary relative aspect-3/4 cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                    onClick={() => setSelectedImage(img.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`}
                      alt={`Evidencia ${img.id}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-end justify-center bg-linear-to-t from-black/60 via-black/0 to-transparent pb-4 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="bg-background/90 text-foreground rounded-full px-4 py-2 text-xs font-bold tracking-widest uppercase shadow-lg backdrop-blur-md">
                        Ampliar
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
