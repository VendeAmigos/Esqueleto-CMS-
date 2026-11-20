'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { StoredMediaItem } from '@esqueleto/core';

export interface MediaPickerModalProps {
  open: boolean;
  multiple?: boolean;
  selectedUrls: string[];
  title?: string;
  onClose: () => void;
  onConfirm: (urls: string[]) => void;
}

const CARD_TINTS = [
  'bg-rose-50/90 border-rose-200/80',
  'bg-amber-50/90 border-amber-200/80',
  'bg-emerald-50/90 border-emerald-200/80',
  'bg-sky-50/90 border-sky-200/80',
  'bg-violet-50/90 border-violet-200/80',
  'bg-stone-100/90 border-stone-300/80',
];

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function MediaPickerModal({
  open,
  multiple = false,
  selectedUrls,
  title,
  onClose,
  onConfirm,
}: MediaPickerModalProps) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<StoredMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [draftUrls, setDraftUrls] = useState<string[]>(selectedUrls);

  useEffect(() => {
    if (open) {
      setDraftUrls(selectedUrls);
      setErrorMsg(null);
    }
  }, [open, selectedUrls]);

  const fetchMedia = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/gallery', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar la galería');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error consultando biblioteca multimedia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      fetchMedia();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fallback de light-dismiss para navegadores sin `closedBy` (modern-web-guidance: light-dismiss-a-dialog)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onCloseListener = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', onCloseListener);

    let cleanupPointer = () => {};
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupPointer = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', onCloseListener);
      cleanupPointer();
    };
  }, [onClose]);

  const handleQuickUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((f) => formData.append('files', f));
      const res = await fetch('/api/gallery/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error subiendo imagen');

      const uploadedItems: StoredMediaItem[] = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => {
        const existingUrls = new Set(uploadedItems.map((u) => u.url));
        return [...uploadedItems, ...prev.filter((p) => !existingUrls.has(p.url))];
      });

      if (uploadedItems.length > 0) {
        const newUrls = uploadedItems.map((u) => u.url);
        if (multiple) {
          setDraftUrls((prev) => Array.from(new Set([...prev, ...newUrls])));
        } else {
          setDraftUrls([newUrls[0]]);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error procesando imágenes');
    } finally {
      setUploading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const hay = `${item.title || ''} ${item.originalName} ${item.filename}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (dateFilter) {
        const day = (item.createdAt || '').slice(0, 10);
        if (day !== dateFilter) return false;
      }
      return true;
    });
  }, [items, search, dateFilter]);

  const toggleSelect = (url: string) => {
    if (multiple) {
      setDraftUrls((prev) =>
        prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
      );
    } else {
      setDraftUrls([url]);
    }
  };

  const setCoverInDraft = (url: string) => {
    setDraftUrls((prev) => [url, ...prev.filter((u) => u !== url)]);
  };

  const extraSelectedUrls = useMemo(() => {
    const libraryUrls = new Set(items.map((item) => item.url));
    return draftUrls.filter((u) => !libraryUrls.has(u));
  }, [draftUrls, items]);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as any)}
      aria-labelledby={headingId}
      className="m-auto w-[min(96vw,64rem)] max-h-[88dvh] rounded-3xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl open:flex open:flex-col"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 bg-white">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base sm:text-lg font-extrabold text-gray-900">
            {title || (multiple ? 'Elegir Fotografías de la Galería' : 'Elegir Fotografía de la Galería')}
          </h2>
          <p className="text-xs text-gray-500">
            {multiple
              ? 'Selecciona una o varias fotografías optimizadas en WebP (la primera será la portada principal).'
              : 'Haz clic en la fotografía que deseas asignar.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple={multiple}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleQuickUpload(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploading ? 'Optimizando WebP...' : 'Subir nuevas'}
          </button>

          <button
            type="button"
            aria-label="Cerrar selector"
            onClick={() => dialogRef.current?.close()}
            className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-gray-100 bg-gray-50/80 px-5 py-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o título..."
          className="flex-1 min-w-[180px] rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 focus:border-black focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          <label htmlFor={`${headingId}-date`} className="text-[11px] font-semibold text-gray-600">
            Fecha:
          </label>
          <input
            id={`${headingId}-date`}
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-xs font-semibold text-indigo-600 hover:underline px-1"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Contenido Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Cargando fotografías...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center space-y-2 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <p className="text-sm font-bold text-gray-700">No hay imágenes disponibles con este filtro</p>
            <p className="text-xs text-gray-500">
              Haz clic en &ldquo;Subir nuevas&rdquo; arriba o sube en lote desde el módulo Galería &amp; FTP WebP.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {filteredItems.map((item, idx) => {
              const selectedIdx = draftUrls.indexOf(item.url);
              const isSelected = selectedIdx !== -1;
              const isCover = multiple && selectedIdx === 0;
              const tint = CARD_TINTS[idx % CARD_TINTS.length];
              const displayName = item.title || item.originalName;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col rounded-2xl border p-2 transition-all ${tint} ${
                    isSelected
                      ? 'ring-2 ring-black border-black shadow-md'
                      : 'hover:border-gray-400 hover:shadow-sm'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={
                      isSelected
                        ? `${displayName} seleccionada${multiple ? ` en posición ${selectedIdx + 1}` : ''}, clic para quitar`
                        : `Seleccionar ${displayName}`
                    }
                    onClick={() => toggleSelect(item.url)}
                    className="group text-left w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2 rounded-xl"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white/80">
                      <img
                        src={item.url}
                        alt={displayName}
                        width={item.width}
                        height={item.height}
                        loading="lazy"
                        {...({ fetchpriority: 'low' } as any)}
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {isSelected && (
                        <span className="absolute top-2 right-2 rounded-full bg-black text-white text-[10px] font-extrabold px-2 py-0.5 shadow-md">
                          {multiple ? (isCover ? '★ Portada' : `#${selectedIdx + 1}`) : 'Elegida'}
                        </span>
                      )}
                      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 text-white text-[10px] font-mono px-1.5 py-0.5">
                        {item.width}x{item.height}
                      </span>
                    </div>
                    <div className="mt-2 px-0.5 space-y-0.5">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-[10px] text-gray-600 flex items-center justify-between">
                        <span>{formatBytes(item.sizeBytes)} WebP</span>
                        <span>{(item.createdAt || '').slice(0, 10)}</span>
                      </p>
                    </div>
                  </button>

                  {multiple && isSelected && (
                    <div className="mt-2 pt-1.5 border-t border-black/10 flex items-center justify-between gap-1">
                      {isCover ? (
                        <span className="text-[10px] font-extrabold text-emerald-700">
                          ★ Portada principal
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Establecer ${displayName} como portada principal`}
                          onClick={() => setCoverInDraft(item.url)}
                          className="min-h-[28px] w-full rounded-lg bg-white hover:bg-black hover:text-white border border-gray-300 text-[11px] font-bold text-gray-900 px-2 py-1 transition-colors"
                        >
                          ★ Hacer portada
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {multiple && extraSelectedUrls.length > 0 && (
        <div className="border-t border-gray-200 bg-amber-50/60 px-5 py-2.5">
          <p className="text-[11px] font-bold text-gray-700 mb-1.5">
            Otras fotos del producto (subidas directo o URL externa):
          </p>
          <div className="flex flex-wrap gap-2">
            {extraSelectedUrls.map((extraUrl, idx) => {
              const pos = draftUrls.indexOf(extraUrl);
              const isExtraCover = pos === 0;
              return (
                <div
                  key={extraUrl}
                  className={`inline-flex items-center gap-2 rounded-xl border bg-white p-1.5 text-xs ${
                    isExtraCover ? 'border-black ring-1 ring-black' : 'border-gray-300'
                  }`}
                >
                  <img
                    src={extraUrl}
                    alt={`Foto externa ${idx + 1}`}
                    className="h-8 w-8 rounded-lg object-cover bg-gray-100 shrink-0"
                  />
                  {isExtraCover ? (
                    <span className="text-[10px] font-extrabold text-emerald-700 px-1">
                      ★ Portada
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCoverInDraft(extraUrl)}
                      className="min-h-[28px] rounded-lg px-2 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      Hacer portada
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Quitar foto externa ${idx + 1}`}
                    onClick={() => toggleSelect(extraUrl)}
                    className="min-h-[28px] rounded-lg px-2 text-[10px] font-bold text-red-600 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {multiple && draftUrls[0] && (
            <img
              src={draftUrls[0]}
              alt="Portada seleccionada"
              className="h-8 w-8 rounded-lg object-cover border border-gray-300 shrink-0"
            />
          )}
          <span className="text-xs font-semibold text-gray-600 truncate">
            {draftUrls.length === 0
              ? 'Ninguna seleccionada'
              : multiple
                ? `${draftUrls.length} ${draftUrls.length === 1 ? 'fotografía' : 'fotografías'} (la #1 será la portada)`
                : '1 fotografía seleccionada'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!multiple && draftUrls.length === 0}
            onClick={() => {
              onConfirm(draftUrls);
              dialogRef.current?.close();
            }}
            className="rounded-xl bg-black hover:bg-gray-800 text-white px-5 py-2 text-xs font-bold shadow-xs transition-colors disabled:opacity-40"
          >
            {multiple ? `Usar seleccionadas (${draftUrls.length})` : 'Usar fotografía'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
