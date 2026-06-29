'use client';

import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LocalImage } from '@/types';

interface FileDropZoneProps {
  localImages: LocalImage[];
  isProcessing: boolean;
  isDragOver: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemoveImage: (index: number) => void;
  onClearImages: () => void;
}

export const FileDropZone = forwardRef<HTMLInputElement, FileDropZoneProps>(
  function FileDropZone(
    {
      localImages,
      isProcessing,
      isDragOver,
      onFilesSelected,
      onRemoveImage,
      onClearImages,
    },
    ref,
  ) {
    const allPreviews = localImages.map((img, idx) => ({
      id: `local-${idx}`,
      previewUrl: img.previewUrl,
      source: 'local' as const,
      localIndex: idx,
    }));
    const hasAttachments = allPreviews.length > 0;

    return (
      <>
        {/* Attachments preview strip */}
        <AnimatePresence>
          {hasAttachments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-border/40 shrink-0 overflow-hidden border-t px-2 py-2 md:px-4"
            >
              <div className="border-border bg-muted/20 rounded-lg border p-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase md:text-xs">
                    <ImageIcon className="h-3 w-3" />
                    {allPreviews.length} screenshot{allPreviews.length !== 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearImages}
                    disabled={isProcessing}
                    className="text-muted-foreground hover:text-destructive h-6 px-2 text-[10px]"
                  >
                    Clear all
                  </Button>
                </div>

                <div className="custom-scrollbar flex gap-1 overflow-x-auto pb-1">
                  <AnimatePresence mode="popLayout">
                    {allPreviews.map((preview) => (
                      <motion.div
                        key={preview.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border md:h-20 md:w-20"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview.previewUrl}
                          alt="Screenshot"
                          className="h-full w-full object-cover"
                        />
                        {!isProcessing && (
                          <button
                            type="button"
                            onClick={() => onRemoveImage(preview.localIndex)}
                            className="bg-destructive text-destructive-foreground absolute top-0.5 right-0.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {!isProcessing && (
                    <button
                      type="button"
                      onClick={() =>
                        (ref as React.RefObject<HTMLInputElement>)?.current?.click()
                      }
                      className="hover:bg-muted text-muted-foreground flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed transition-colors md:h-20 md:w-20"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-[9px]">Add</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input */}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              onFilesSelected(e.target.files);
              e.target.value = '';
            }
          }}
        />

        {/* Full-screen drag overlay */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <div className="border-primary bg-card flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed p-8">
                <Upload className="text-primary h-12 w-12" />
                <p className="text-foreground text-lg font-bold">
                  Drop screenshots here
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  },
);
