'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { StoredMediaItem } from '@esqueleto/core';
import { GALLERY_PRESETS, type GalleryColumnCount } from '@esqueleto/core/grid';
import {
  bulkToggleMediaVisibilityAction,
  deleteMediaItemAction,
  toggleMediaVisibilityAction,
  updateMediaItemFormatAction,
} from './actions';
import GalleryGridEditor from './GalleryGridEditor';

interface UploadQueueItem {
  id: string;
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  savingPercent?: number;
  detail?: string;
}

interface GalleryAdminWorkspaceProps {
  initialItems: StoredMediaItem[];
  initialColumns: GalleryColumnCount;
  initialEngine: 'cwebp' | 'sharp';
  initialFtpSynced: number;
  ftpHostHint: string;
  ftpUser: string;
}

type AdminGalleryTab = 'library' | 'grid';
type DatePreset = 'all' | 'today' | '7d' | 'month' | 'custom';
type VisibilityFilter = 'all' | 'public' | 'hidden';
type SourceFilter = 'all' | 'web' | 'ftp' | 'existing';

const PHOTO_CARD_TINTS = [
  'bg-rose-50/90 border-rose-200',
  'bg-amber-50/90 border-amber-200',
  'bg-emerald-50/90 border-emerald-200',
  'bg-sky-50/90 border-sky-200',
  'bg-violet-50/90 border-violet-200',
  'bg-teal-50/90 border-teal-200',
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function GalleryAdminWorkspace({
  initialItems,
  initialColumns,
  initialEngine,
  initialFtpSynced,
  ftpHostHint,
  ftpUser,
}: GalleryAdminWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<AdminGalleryTab>('library');
  const [items, setItems] = useState<StoredMediaItem[]>(initialItems);
  const [columns, setColumns] = useState<GalleryColumnCount>(initialColumns);
  const [engine, setEngine] = useState<'cwebp' | 'sharp'>(initialEngine);

  // Subida múltiple & FTP
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [uploadIntoGallery, setUploadIntoGallery] = useState(false);
  const [isSyncingFtp, setIsSyncingFtp] = useState(false);
  const [ftpBanner, setFtpBanner] = useState<string | null>(
    initialFtpSynced > 0
      ? `Se optimizaron y movieron ${initialFtpSynced} fotografía(s) desde uploads/ftp-inbox (originales eliminados).`
      : null
  );

  // Filtros
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Selección múltiple y edición rápida
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Auto-sincronización ligera de bandeja FTP mientras el admin está en la pestaña Biblioteca
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden || isSyncingFtp) return;
      try {
        const res = await fetch('/api/gallery/sync-ftp', { method: 'POST' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.engine) setEngine(data.engine);
        if (Array.isArray(data.processed) && data.processed.length > 0) {
          setItems((prev) => {
            const incomingUrls = new Set(data.processed.map((p: StoredMediaItem) => p.url));
            return [...data.processed, ...prev.filter((p) => !incomingUrls.has(p.url))];
          });
          setFtpBanner(
            `FTP sincronizado automáticamente: ${data.processed.length} foto(s) convertidas a WebP y originales eliminados.`
          );
        }
      } catch {
        // ignore silent poll failure
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isSyncingFtp]);

  const handleBatchUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|avif|bmp|tiff?)$/i.test(f.name));
    if (files.length === 0) return;

    const entries: UploadQueueItem[] = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      name: file.name,
      status: 'pending',
    }));
    setQueue((prev) => [...entries, ...prev].slice(0, 40));

    // Subir en lotes de 4 para barra de progreso fluida sin saturar memoria
    const CHUNK_SIZE = 4;
    for (let i = 0; i < files.length; i += CHUNK_SIZE) {
      const sliceFiles = files.slice(i, i + CHUNK_SIZE);
      const sliceEntries = entries.slice(i, i + CHUNK_SIZE);
      const sliceIdSet = new Set(sliceEntries.map((e) => e.id));

      setQueue((prev) =>
        prev.map((q) => (sliceIdSet.has(q.id) ? { ...q, status: 'uploading' } : q))
      );

      const formData = new FormData();
      sliceFiles.forEach((f) => formData.append('files', f));
      formData.append('showInGallery', uploadIntoGallery ? 'true' : 'false');

      try {
        const res = await fetch('/api/gallery/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al optimizar');

        const results = Array.isArray(data.results) ? data.results : [];
        const newItems: StoredMediaItem[] = results.map((r: any) => r.item).filter(Boolean);
        if (results[0]?.engine) setEngine(results[0].engine);

        if (newItems.length > 0) {
          setItems((prev) => {
            const newUrls = new Set(newItems.map((u) => u.url));
            return [...newItems, ...prev.filter((p) => !newUrls.has(p.url))];
          });
        }

        setQueue((prev) =>
          prev.map((q) => {
            const idxInSlice = sliceEntries.findIndex((e) => e.id === q.id);
            if (idxInSlice === -1) return q;
            const r = results[idxInSlice];
            if (!r) {
              return { ...q, status: 'error', detail: data.errors?.[0] || 'Falló conversión' };
            }
            return {
              ...q,
              status: 'done',
              savingPercent: r.savingPercent,
              detail: `${formatBytes(r.originalSizeBytes)} → ${formatBytes(r.compressedSizeBytes)} WebP (-${r.savingPercent}%)`,
            };
          })
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            sliceIdSet.has(q.id)
              ? { ...q, status: 'error', detail: err?.message || 'Error de subida' }
              : q
          )
        );
      }
    }
  };

  const handleManualFtpSync = async () => {
    setIsSyncingFtp(true);
    try {
      const res = await fetch('/api/gallery/sync-ftp', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error sincronizando bandeja FTP');
      if (data.engine) setEngine(data.engine);

      const processed: StoredMediaItem[] = Array.isArray(data.processed) ? data.processed : [];
      if (processed.length > 0) {
        setItems((prev) => {
          const urls = new Set(processed.map((p) => p.url));
          return [...processed, ...prev.filter((p) => !urls.has(p.url))];
        });
        setFtpBanner(
          `Bandeja FTP procesada (${engine}): ${processed.length} imagen(es) optimizadas a WebP y originales eliminados.`
        );
      } else {
        setFtpBanner('Bandeja FTP (uploads/ftp-inbox) revisada: sin archivos nuevos pendientes.');
      }
    } catch (err: any) {
      setFtpBanner(err?.message || 'No se pudo revisar la bandeja FTP.');
    } finally {
      setIsSyncingFtp(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    return items.filter((item) => {
      if (q) {
        const hay = `${item.title || ''} ${item.originalName} ${item.filename}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (visibilityFilter === 'public' && !item.showInGallery) return false;
      if (visibilityFilter === 'hidden' && item.showInGallery) return false;

      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;

      const day = (item.createdAt || '').slice(0, 10);
      if (datePreset === 'today' && day !== todayIso) return false;
      if (datePreset === '7d' && day < sevenDaysAgo) return false;
      if (datePreset === 'month' && day < monthStart) return false;
      if (datePreset === 'custom') {
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
      }

      return true;
    });
  }, [items, search, visibilityFilter, sourceFilter, datePreset, fromDate, toDate]);

  const publicItems = useMemo(() => items.filter((i) => i.showInGallery), [items]);

  const handleToggleVisibility = async (id: string, nextVisible: boolean) => {
    setBusyIds((prev) => ({ ...prev, [id]: true }));
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, showInGallery: nextVisible } : i)));
    const res = await toggleMediaVisibilityAction(id, nextVisible);
    if (!res.success) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, showInGallery: !nextVisible } : i)));
      alert(res.error || 'No se pudo cambiar la visibilidad.');
    }
    setBusyIds((prev) => ({ ...prev, [id]: false }));
  };

  const handlePresetFormatChange = async (id: string, presetId: string) => {
    setBusyIds((prev) => ({ ...prev, [id]: true }));
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, gridSpan: presetId } : i)));
    const res = await updateMediaItemFormatAction(id, { gridSpan: presetId });
    if (!res.success) {
      alert(res.error || 'Error guardando formato.');
    }
    setBusyIds((prev) => ({ ...prev, [id]: false }));
  };

  const handleSaveTitle = async (id: string) => {
    const draft = titleDrafts[id];
    if (draft === undefined) return;
    setBusyIds((prev) => ({ ...prev, [id]: true }));
    const res = await updateMediaItemFormatAction(id, { title: draft.trim() || null });
    if (res.success && res.item) {
      setItems((prev) => prev.map((i) => (i.id === id ? res.item! : i)));
    }
    setBusyIds((prev) => ({ ...prev, [id]: false }));
  };

  const handleBulkVisibility = async (visible: boolean) => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    const idSet = new Set(selectedIds);
    setItems((prev) => prev.map((i) => (idSet.has(i.id) ? { ...i, showInGallery: visible } : i)));
    await bulkToggleMediaVisibilityAction(selectedIds, visible);
    setBulkBusy(false);
    setSelectedIds([]);
  };

  const handleDeleteOne = async (id: string) => {
    if (!confirm('¿Eliminar permanentemente esta fotografía del servidor y la galería?')) return;
    setBusyIds((prev) => ({ ...prev, [id]: true }));
    const res = await deleteMediaItemAction(id, true);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    } else {
      alert(res.error || 'No se pudo eliminar');
    }
    setBusyIds((prev) => ({ ...prev, [id]: false }));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.length} fotografía(s) del servidor?`)) return;
    setBulkBusy(true);
    for (const id of selectedIds) {
      const res = await deleteMediaItemAction(id, true);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    }
    setSelectedIds([]);
    setBulkBusy(false);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const tabs: AdminGalleryTab[] = ['library', 'grid'];
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextIdx = (idx + 1) % tabs.length;
      setActiveTab(tabs[nextIdx]);
      tabRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Pestañas Accesibles (modern-web-guidance: tabs) */}
      <div className="border-b border-gray-200 pb-1">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
              Galería Multimedia, FTP &amp; Grid Pinterest
            </h1>
            <p className="mt-1.5 text-sm text-gray-600 max-w-2xl">
              Sube múltiples fotos por Web o FTP, optimízalas con Google WebP (eliminando el original) y organiza cuáles aparecen en la tienda con acomodo automático inteligente.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Motor WebP: {engine === 'cwebp' ? 'Google cwebp (nativo)' : 'libwebp (sharp)'}
            </span>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Vistas de Galería Multimedia"
          className="flex items-center gap-6 overflow-x-auto"
        >
          <button
            ref={(el) => {
              tabRefs.current[0] = el;
            }}
            type="button"
            role="tab"
            id="tab-gallery-library"
            aria-selected={activeTab === 'library'}
            tabIndex={activeTab === 'library' ? 0 : -1}
            onKeyDown={(e) => handleTabKeyDown(e, 0)}
            onClick={() => setActiveTab('library')}
            className={`shrink-0 pb-3 pt-2 px-1 text-sm font-bold transition-colors ${
              activeTab === 'library'
                ? 'text-indigo-700'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            1. Biblioteca, Subida &amp; FTP ({items.length})
          </button>

          <button
            ref={(el) => {
              tabRefs.current[1] = el;
            }}
            type="button"
            role="tab"
            id="tab-gallery-grid"
            aria-selected={activeTab === 'grid'}
            tabIndex={activeTab === 'grid' ? 0 : -1}
            onKeyDown={(e) => handleTabKeyDown(e, 1)}
            onClick={() => setActiveTab('grid')}
            className={`shrink-0 pb-3 pt-2 px-1 text-sm font-bold transition-colors ${
              activeTab === 'grid'
                ? 'text-indigo-700'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            2. Layout Grid ({columns} Cols) &amp; Acomodo Automático ({publicItems.length})
          </button>
        </div>
      </div>

      {/* PANEL 1: BIBLIOTECA, SUBIDA MÚLTIPLE Y FTP */}
      <div
        role="tabpanel"
        aria-labelledby="tab-gallery-library"
        hidden={activeTab !== 'library'}
      >
        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Zona Subida Múltiple + Info FTP */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 rounded-3xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">
                      Subida Múltiple con Optimización WebP + Borrado de Originales
                    </h2>
                    <p className="text-xs text-gray-500">
                      Arrastra o selecciona decenas de fotos a la vez (JPG, PNG, AVIF, WebP). Cada archivo se convierte a WebP optimizado y su origen temporal se elimina automáticamente.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadIntoGallery}
                      onChange={(e) => setUploadIntoGallery(e.target.checked)}
                      className="rounded text-indigo-600 h-4 w-4"
                    />
                    Publicar directo en galería
                  </label>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleBatchUpload(e.target.files);
                    e.target.value = '';
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.length) {
                      handleBatchUpload(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-indigo-600 bg-indigo-50/70 scale-[1.005]'
                      : 'border-gray-300 bg-gray-50/60 hover:border-black'
                  }`}
                >
                  <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-indigo-600 border border-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    Arrastra tus fotografías aquí o haz clic para seleccionar varias
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Hasta 50 imágenes por lote (25 MB máx. c/u) • Salida optimizada WebP (2000px máx.)
                  </p>
                </div>

                {queue.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 space-y-2 max-h-44 overflow-y-auto">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                      <span>Cola de optimización WebP ({queue.filter((q) => q.status === 'done').length}/{queue.length})</span>
                      <button
                        type="button"
                        onClick={() => setQueue([])}
                        className="text-indigo-600 hover:underline"
                      >
                        Limpiar lista
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {queue.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white border border-gray-200 px-2.5 py-1.5 text-[11px]"
                        >
                          <span className="truncate font-semibold text-gray-800">{q.name}</span>
                          {q.status === 'uploading' && (
                            <span className="text-indigo-600 font-bold shrink-0">Optimizando...</span>
                          )}
                          {q.status === 'pending' && (
                            <span className="text-gray-400 font-medium shrink-0">En espera</span>
                          )}
                          {q.status === 'done' && (
                            <span className="text-emerald-700 font-mono font-bold shrink-0">
                              {q.detail}
                            </span>
                          )}
                          {q.status === 'error' && (
                            <span className="text-red-600 font-bold truncate max-w-[140px]">
                              {q.detail}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Servidor / Bandeja FTP */}
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-extrabold text-gray-900">
                      Servidor / Bandeja FTP
                    </h2>
                    <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-0.5 text-[10px] font-bold">
                      uploads/ftp-inbox
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Sube lotes grandes desde <strong>FileZilla</strong> (vía SFTP puerto <code className="font-mono bg-gray-100 px-1 rounded">22</code> o contenedor FTP opcional puerto <code className="font-mono bg-gray-100 px-1 rounded">21</code>) hacia la bandeja <code className="font-mono bg-gray-100 px-1 rounded">uploads/ftp-inbox</code>. Cada archivo se convierte a WebP y su original se borra al instante.
                  </p>

                  <div className="rounded-2xl bg-slate-900 text-slate-100 p-3 text-[11px] font-mono space-y-1">
                    <div>Host: <span className="text-sky-300">{ftpHostHint}</span></div>
                    <div>Usuario FTP: <span className="text-emerald-300">{ftpUser}</span></div>
                    <div>Carpeta Inbox: <span className="text-amber-300">uploads/ftp-inbox</span></div>
                  </div>

                  {ftpBanner && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900">
                      {ftpBanner}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isSyncingFtp}
                  onClick={handleManualFtpSync}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-gray-800 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isSyncingFtp ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isSyncingFtp ? 'Optimizando Bandeja FTP...' : 'Sincronizar Bandeja FTP ahora'}
                </button>
              </div>
            </div>

            {/* Barra de Filtros por Fecha, Estado, Origen y Búsqueda */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar fotografía por nombre o título..."
                  className="flex-1 min-w-[200px] rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-medium text-gray-900 focus:border-black focus:outline-none"
                />

                <select
                  aria-label="Filtrar por visibilidad en galería"
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800"
                >
                  <option value="all">Todas ({items.length})</option>
                  <option value="public">Visibles en Galería ({publicItems.length})</option>
                  <option value="hidden">Solo Biblioteca ({items.length - publicItems.length})</option>
                </select>

                <select
                  aria-label="Filtrar por origen"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800"
                >
                  <option value="all">Cualquier origen</option>
                  <option value="web">Subida Web</option>
                  <option value="ftp">Bandeja FTP</option>
                  <option value="existing">Existentes</option>
                </select>
              </div>

              {/* Filtro por Fecha de Subida */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-600 mr-1">Fecha de subida:</span>
                {([
                  { id: 'all', label: 'Todas las fechas' },
                  { id: 'today', label: 'Hoy' },
                  { id: '7d', label: 'Últimos 7 días' },
                  { id: 'month', label: 'Este mes' },
                  { id: 'custom', label: 'Rango personalizado' },
                ] as { id: DatePreset; label: string }[]).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDatePreset(p.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      datePreset === p.id
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                {datePreset === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2 ml-1">
                    <input
                      type="date"
                      aria-label="Desde fecha"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs"
                    />
                    <span className="text-xs text-gray-400">a</span>
                    <input
                      type="date"
                      aria-label="Hasta fecha"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Acciones en lote */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(filteredItems.map((i) => i.id))}
                    className="font-bold text-indigo-600 hover:underline"
                  >
                    Seleccionar filtradas ({filteredItems.length})
                  </button>
                  {selectedIds.length > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="font-semibold text-gray-500 hover:text-black"
                      >
                        Limpiar ({selectedIds.length})
                      </button>
                    </>
                  )}
                </div>

                {selectedIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={() => handleBulkVisibility(true)}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold"
                    >
                      Mostrar en Galería ({selectedIds.length})
                    </button>
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={() => handleBulkVisibility(false)}
                      className="rounded-lg bg-gray-700 hover:bg-gray-900 text-white px-3 py-1.5 text-xs font-bold"
                    >
                      Ocultar de Galería
                    </button>
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={handleBulkDelete}
                      className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Cuadrícula de tarjetas con fondo distinto para facilitar la selección */}
            {filteredItems.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-12 text-center space-y-2">
                <p className="text-base font-extrabold text-gray-800">
                  No hay fotografías que coincidan con los filtros
                </p>
                <p className="text-xs text-gray-500">
                  Sube un lote arriba o limpia el filtro de fechas para ver toda tu biblioteca.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item, idx) => {
                  const isSelected = selectedIds.includes(item.id);
                  const tint = PHOTO_CARD_TINTS[idx % PHOTO_CARD_TINTS.length];
                  const savings =
                    item.originalSizeBytes > item.sizeBytes && item.originalSizeBytes > 0
                      ? Math.round(((item.originalSizeBytes - item.sizeBytes) / item.originalSizeBytes) * 100)
                      : 0;
                  const presetMatch = item.gridSpan.split('@')[0] || '1x1';

                  return (
                    <article
                      key={item.id}
                      className={`rounded-2xl border p-3 flex flex-col justify-between gap-3 transition-all ${tint} ${
                        isSelected
                          ? 'ring-2 ring-black border-black shadow-md'
                          : item.showInGallery
                            ? 'shadow-sm ring-1 ring-emerald-500/40'
                            : 'opacity-95 hover:shadow-sm'
                      }`}
                    >
                      {/* Top: Checkbox selección múltiple + Switch Galería Pública */}
                      <div className="flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedIds((prev) =>
                                e.target.checked
                                  ? [...prev, item.id]
                                  : prev.filter((sid) => sid !== item.id)
                              );
                            }}
                            className="h-4 w-4 rounded border-gray-400 text-black focus:ring-black"
                          />
                          Elegir
                        </label>

                        <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-800 cursor-pointer">
                          <span className={item.showInGallery ? 'text-emerald-700' : 'text-gray-500'}>
                            {item.showInGallery ? 'En Galería' : 'Oculta'}
                          </span>
                          <input
                            type="checkbox"
                            {...({ switch: '' } as any)}
                            checked={item.showInGallery}
                            disabled={Boolean(busyIds[item.id])}
                            onChange={(e) => handleToggleVisibility(item.id, e.target.checked)}
                            aria-label={`Mostrar ${item.title || item.originalName} en galería pública`}
                          />
                        </label>
                      </div>

                      {/* Foto con contenedor limpio */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-white border border-black/10">
                        <img
                          src={item.url}
                          alt={item.title || item.originalName}
                          width={item.width}
                          height={item.height}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute bottom-1.5 left-1.5 flex flex-wrap gap-1">
                          <span className="rounded-md bg-black/75 text-white text-[10px] font-mono px-1.5 py-0.5">
                            {item.width}×{item.height}
                          </span>
                          <span className="rounded-md bg-white/95 text-gray-900 text-[10px] font-bold px-1.5 py-0.5">
                            {formatBytes(item.sizeBytes)} WebP
                            {savings > 0 ? ` (-${savings}%)` : ''}
                          </span>
                        </div>
                        <span className="absolute top-1.5 right-1.5 rounded-full bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 uppercase">
                          {item.source}
                        </span>
                      </div>

                      {/* Título editable + fecha */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            aria-label="Título de fotografía"
                            value={
                              titleDrafts[item.id] !== undefined
                                ? titleDrafts[item.id]
                                : item.title || ''
                            }
                            onChange={(e) =>
                              setTitleDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            onBlur={() => handleSaveTitle(item.id)}
                            placeholder={item.originalName}
                            className="flex-1 min-w-0 rounded-lg border border-black/15 bg-white/90 px-2.5 py-1 text-xs font-bold text-gray-900 focus:border-black focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-600 px-0.5">
                          <span>Subida: {(item.createdAt || '').slice(0, 10)}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteOne(item.id)}
                            className="text-red-600 hover:underline font-bold"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      {/* Formatos predeterminados en la misma fotografía */}
                      <div className="pt-2 border-t border-black/10 space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-600">
                          Formato predeterminado en Grid:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {GALLERY_PRESETS.slice(0, 6).map((preset) => {
                            const active = presetMatch === preset.id;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                disabled={Boolean(busyIds[item.id])}
                                onClick={() => handlePresetFormatChange(item.id, preset.id)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                                  active
                                    ? 'bg-black text-white shadow-2xs'
                                    : 'bg-white/90 text-gray-800 border border-black/15 hover:border-black'
                                }`}
                              >
                                {preset.short} ({preset.id})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PANEL 2: LAYOUT GRID 2D & ACOMODO AUTOMÁTICO */}
      <div
        role="tabpanel"
        aria-labelledby="tab-gallery-grid"
        hidden={activeTab !== 'grid'}
      >
        {activeTab === 'grid' && (
          <GalleryGridEditor
            visibleItems={publicItems}
            initialColumns={columns}
            onLayoutSaved={(nextCols, updates) => {
              setColumns(nextCols);
              const updateMap = new Map(updates.map((u) => [u.id, u]));
              setItems((prev) =>
                prev.map((item) => {
                  const match = updateMap.get(item.id);
                  return match
                    ? { ...item, gridSpan: match.gridSpan, displayOrder: match.displayOrder }
                    : item;
                })
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
