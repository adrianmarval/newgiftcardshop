'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ImageDropzoneProps {
  images: Array<{ id: string; previewUrl: string }>;
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  emptyLabel?: string;
  emptySublabel?: string;
  maxHeight?: string;
}

export function ImageDropzone({
  images,
  onAdd,
  onRemove,
  onClear,
  emptyLabel = 'Drag screenshots or click here',
  emptySublabel,
  maxHeight = 'max-h-[400px]',
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onAdd(acceptedFiles);
      }
    },
    [onAdd],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    noClick: images.length > 0,
    noKeyboard: true,
  });

  const hasImages = images.length > 0;

  return (
    <div
      {...getRootProps()}
      className={`border-border bg-muted/20 hover:bg-muted/30 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
        isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : ''
      }`}
    >
      <input {...getInputProps()} />

      {!hasImages ? (
        // Empty state — centered upload prompt
        <>
          <Upload className={`mx-auto mb-2 h-8 w-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground/50'}`} />
          <p className="text-foreground mb-1 text-sm font-semibold">{emptyLabel}</p>
          {emptySublabel && <p className="text-muted-foreground text-xs">{emptySublabel}</p>}
        </>
      ) : (
        // Thumbnail grid inside dropzone
        <div className="relative">
          {/* Clear all button */}
          <div className="absolute top-0 right-0 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-muted-foreground hover:text-destructive h-7 text-xs"
            >
              Clear all
            </Button>
          </div>

          <div className={`grid ${maxHeight} grid-cols-3 gap-2 overflow-y-auto pb-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6`}>
            <AnimatePresence>
              {images.map((img) => (
                <motion.div
                  key={img.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="group border-border bg-background relative aspect-square overflow-hidden rounded-lg border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- previewUrl is a local blob: URL */}
                  <img src={img.previewUrl} alt="Screenshot" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(img.id);
                    }}
                    className="bg-destructive text-destructive-foreground absolute top-1 right-1 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add more button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              className="hover:bg-muted text-muted-foreground flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[10px]">Add</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
