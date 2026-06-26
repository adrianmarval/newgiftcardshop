'use client';

import { useState, useCallback, useRef } from 'react';
import { useAction } from 'next-safe-action/hooks';
import { uploadImage } from '@/actions/seller/ocr/upload-image';
import { extractDraft } from '@/actions/seller/ocr/extract-draft';
import { checkCodes } from '@/actions/seller/batches';
import { parseClaimCodes, normalizeClaimCode } from '@/lib/utils/claim-code-parser';
import { showAlert } from '@/lib/ui';
import { useSellFlow } from '@/hooks/use-sell-flow';
import { SellFlowImage, type ProcessingStage } from '@/types';
import { MAX_BATCH_SIZE } from '@/lib/constants';

type LocalImage = { file: File; previewUrl: string };

interface UseDataEntryPipelineProps {
  pasteContent: string;
  localImages: LocalImage[];
  setLocalImages: React.Dispatch<React.SetStateAction<LocalImage[]>>;
  setStep: (step: number) => void;
}

export function useDataEntryPipeline({
  pasteContent,
  localImages,
  setLocalImages,
  setStep,
}: UseDataEntryPipelineProps) {
  const {
    addImage,
    clearImages,
    setGiftcards,
    handleBulkImport,
    ingestOCRDraft,
    selectedBrandCountry,
  } = useSellFlow();

  const brandId = selectedBrandCountry?.split('|')[0] ?? '';
  const countryId = selectedBrandCountry?.split('|')[1] ?? '';

  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [dbBlockedCodes, setDbBlockedCodes] = useState<string[]>([]);

  const pendingDbCheckRef = useRef<(() => void) | null>(null);
  const pendingCodeToLineMapRef = useRef<Map<string, number>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = stage !== 'idle' && stage !== 'done';
  const hasContent = pasteContent.trim().length > 0 || localImages.length > 0;

  // ── DB check action ──────────────────────────────────────────────────────

  const { execute: runCheckExistingCodes } = useAction(checkCodes, {
    onSuccess: ({ data }) => {
      if (data?.success && data.existingCodes && data.existingCodes.length > 0) {
        const codeToLineMap = pendingCodeToLineMapRef.current;
        const existingErrors = (data.existingCodes as string[]).map((code) => {
          const normalizedCode = code.replace(/[^A-Z0-9]/g, '').toUpperCase();
          const line = codeToLineMap.get(normalizedCode);
          if (line) {
            return `Line ${line}: Code ${code} already exists in inventory`;
          }
          return `Code ${code} already exists in inventory`;
        });
        setValidationErrors(existingErrors);
        setDbBlockedCodes(data.existingCodes as string[]);
        setStage('idle');
        return;
      }
      pendingDbCheckRef.current?.();
    },
    onError: ({ error }) => {
      console.error('[DB-CHECK] Error checking existing codes:', error.serverError);
      pendingDbCheckRef.current?.();
    },
  });

  // ── OCR extraction action ─────────────────────────────────────────────────

  const { execute: runExtraction } = useAction(extractDraft, {
    onSuccess: ({ data }) => {
      if (data?.cards) {
        setStage('ingesting');

        const seen = new Map<string, (typeof data.cards)[0]>();
        for (const card of data.cards) {
          const key = card.claimCode?.toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
          if (!key) continue;
          const existing = seen.get(key);
          if (!existing) {
            seen.set(key, card);
          } else {
            if (!existing.amount && card.amount) {
              seen.set(key, card);
            }
          }
        }

        const deduped = Array.from(seen.values());

        const unmatchedImageIds: string[] = [];

        if (data.ignoredImages && data.ignoredImages.length > 0) {
          unmatchedImageIds.push(...data.ignoredImages.map((img) => img.imageId));
        }

        const onlyMatchExisting = deduped.filter((c) => {
          const normCode = c.claimCode?.toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
          const existing = useSellFlow.getState().giftcards.filter(
            (g) => g.claimCode.toUpperCase().replace(/[^A-Z0-9]/g, '') === normCode,
          );
          if (existing.length > 0) {
            return true;
          } else {
            if (c.imageId) unmatchedImageIds.push(c.imageId);
            return false;
          }
        });

        ingestOCRDraft(onlyMatchExisting);
        useSellFlow.getState().setUnmatchedImages(unmatchedImageIds.map((id) => ({ imageId: id })));

        if (onlyMatchExisting.length > 0) {
          showAlert.toast.success(
            `${onlyMatchExisting.length} card${onlyMatchExisting.length > 1 ? 's' : ''} linked from screenshots`,
          );
        }

        const textCodes = useSellFlow.getState().giftcards.map((g) => g.claimCode);
        if (textCodes.length > 0) {
          pendingDbCheckRef.current = () => {
            setStage('done');
            setTimeout(() => setStep(3), 600);
          };
          pendingCodeToLineMapRef.current = new Map();
          runCheckExistingCodes({
            codes: textCodes,
            brandId: brandId,
            countryId: countryId,
          });
          return;
        }

        setStage('done');
        setTimeout(() => setStep(3), 600);
      }
    },
    onError: ({ error }) => {
      console.error(`[AI-OCR-BATCH] Server/Network error:`, error.serverError);
      showAlert.error('Extraction error', error.serverError || 'Could not read images');
      setStage('idle');
    },
  });

  // ── Main processing pipeline ──────────────────────────────────────────────

  const proceedToImageUpload = useCallback(
    (filesToUpload: Array<{ file: File; previewUrl: string }>, parsedCount: number) => {
      if (filesToUpload.length > 0) {
        setStage('uploading');
        (async () => {
          let uploaded = 0;

          for (const localImg of filesToUpload) {
            try {
              const result = await uploadImage({ file: localImg.file });
              if (result.data?.compressedData) {
                const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                const newImage: SellFlowImage = {
                  id: imageId,
                  compressedData: result.data.compressedData,
                  previewUrl: localImg.previewUrl,
                };
                addImage(newImage);
                uploaded++;
              } else {
                showAlert.error(
                  `Error with ${localImg.file.name}`,
                  result.serverError || 'Upload failed',
                );
              }
            } catch (error) {
              showAlert.error(`Error with ${localImg.file.name}`, 'Critical upload error');
            }
          }

          setLocalImages([]);

          if (uploaded > 0) {
            showAlert.toast.success(`${uploaded} screenshot${uploaded > 1 ? 's' : ''} uploaded`);
          }

          const storeImages = useSellFlow.getState().images;
          if (storeImages.length > 0) {
            setStage('extracting');
            runExtraction({
              images: storeImages.map((img) => ({
                id: img.id,
                compressedData: img.compressedData,
              })),
            });
          } else {
            const allGiftcards = useSellFlow.getState().giftcards;
            if (parsedCount > 0 || allGiftcards.length > 0) {
              setStage('done');
              setTimeout(() => setStep(3), 400);
            } else {
              showAlert.toast.info('No cards to process');
              setStage('idle');
            }
          }
        })();
      } else {
        const allGiftcards = useSellFlow.getState().giftcards;
        if (parsedCount > 0 || allGiftcards.length > 0) {
          setStage('done');
          setTimeout(() => setStep(3), 400);
        } else {
          showAlert.toast.info('No cards to process');
          setStage('idle');
        }
      }
    },
    [addImage, setStep, setLocalImages, setStage, runExtraction],
  );

  const handleProcessCards = useCallback(async () => {
    if (!hasContent) {
      showAlert.toast.info('Paste codes or attach screenshots first');
      return;
    }

    setValidationErrors([]);

    const filesToUpload = [...localImages];

    setGiftcards([]);
    clearImages();

    setStage('parsing');
    let parsedCount = 0;

    if (pasteContent.trim()) {
      let allErrors: string[] = [];
      const { parsed, errors, duplicates } = parseClaimCodes(pasteContent);

      if (errors.length > 0) {
        allErrors = [...errors];
      }

      if (duplicates.length > 0) {
        allErrors = [...allErrors, ...duplicates];
      }

      const codeToLineMap = new Map<string, number>();
      const lines = pasteContent.split('\n');
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        const candidateRe = /[A-Z0-9][A-Z0-9-]{13,17}[A-Z0-9]/gi;
        const match = trimmedLine.match(candidateRe);
        if (match) {
          const normalized = normalizeClaimCode(match[0]);
          if (normalized) {
            codeToLineMap.set(normalized, lineIdx + 1);
          }
        }
      }

      if (parsed.length > MAX_BATCH_SIZE) {
        showAlert.error(
          `Máximo ${MAX_BATCH_SIZE} tarjetas por batch`,
          `Elimina líneas y vuelve a intentar. Puedes dividir en múltiples lotes.`,
        );
        setStage('idle');
        return;
      }

      if (parsed.length > 0) {
        const result = handleBulkImport(parsed);

        if (result.error) {
          showAlert.error('Límite excedido', result.error);
          setStage('idle');
          return;
        }

        parsedCount = result.importedCount;

        const allGiftcards = useSellFlow.getState().giftcards;
        const missingAmountErrors = allGiftcards
          .filter((g) => !g.amount || g.amount.trim() === '')
          .map(
            (g) =>
              `Line ${g.id}: Missing amount for claim code ${g.claimCode}`,
          );

        if (missingAmountErrors.length > 0) {
          allErrors = [...allErrors, ...missingAmountErrors];
        }
      }

      if (allErrors.length > 0) {
        setValidationErrors(allErrors);
        setStage('idle');
        return;
      }

      const allCodes = useSellFlow.getState().giftcards.map((g) => g.claimCode);
      if (allCodes.length > 0) {
        pendingDbCheckRef.current = () =>
          proceedToImageUpload(filesToUpload, parsedCount);
        pendingCodeToLineMapRef.current = codeToLineMap;
        runCheckExistingCodes({
          codes: allCodes,
          brandId: brandId,
          countryId: countryId,
        });
        return;
      }
    }

    proceedToImageUpload(filesToUpload, parsedCount);
  }, [
    hasContent,
    localImages,
    pasteContent,
    brandId,
    countryId,
    setGiftcards,
    clearImages,
    handleBulkImport,
    proceedToImageUpload,
    runCheckExistingCodes,
  ]);

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const filesArray = Array.from(files).filter((f) =>
        f.type.startsWith('image/'),
      );
      if (filesArray.length === 0) {
        showAlert.toast.error('Select valid images');
        return;
      }

      const uniqueFiles: File[] = [];
      let duplicateCount = 0;

      for (const f of filesArray) {
        const isDuplicate =
          localImages.some(
            (local) =>
              local.file.name === f.name &&
              local.file.size === f.size &&
              local.file.lastModified === f.lastModified,
          ) ||
          uniqueFiles.some(
            (u) =>
              u.name === f.name &&
              u.size === f.size &&
              u.lastModified === f.lastModified,
          );

        if (isDuplicate) {
          duplicateCount++;
        } else {
          uniqueFiles.push(f);
        }
      }

      if (uniqueFiles.length === 0 && filesArray.length > 0) {
        showAlert.toast.info('Selected images are already attached');
        return;
      }

      if (duplicateCount > 0) {
        showAlert.toast.info(
          `${duplicateCount} duplicate${duplicateCount !== 1 ? 's' : ''} skipped`,
        );
      }

      const newImages = uniqueFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setLocalImages((prev) => [...prev, ...newImages]);
    },
    [localImages, setLocalImages],
  );

  const removeLocalImage = useCallback(
    (index: number) => {
      setLocalImages((prev) => {
        const removed = prev[index];
        if (removed) URL.revokeObjectURL(removed.previewUrl);
        return prev.filter((_, i) => i !== index);
      });
    },
    [setLocalImages],
  );

  const clearLocalImages = useCallback(() => {
    setLocalImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
  }, [setLocalImages]);

  return {
    stage,
    setStage,
    validationErrors,
    setValidationErrors,
    dbBlockedCodes,
    setDbBlockedCodes,
    isProcessing,
    hasContent,
    handleProcessCards,
    handleFilesSelected,
    removeLocalImage,
    clearLocalImages,
    fileInputRef,
  };
}
