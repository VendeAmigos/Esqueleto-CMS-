'use client';

import { useState, useRef, useEffect } from 'react';
import {
  createCategory,
  updateCategory,
  updateCategoryGrid,
  updateCategoryOrder,
  reorderCategories,
  deleteCategory,
} from './actions';

import { getGridSpanClasses, GRID_PRESETS, normalizeSpan } from '@esqueleto/core/grid';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  gridSpan: string;
  displayOrder: number;
}

interface CategoryGridManagerProps {
  categories: CategoryItem[];
}

export default function CategoryGridManager({ categories: initialCategories }: CategoryGridManagerProps) {
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  // Drag and Drop (Reordenar)
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Resize interactivo con esquinas (Estirar)
  const [resizingState, setResizingState] = useState<{
    id: string;
    mode: 'both' | 'col' | 'row';
    startX: number;
    startY: number;
    startCols: number;
    startRows: number;
    cardRect: DOMRect;
  } | null>(null);

  // Formulario nueva categoría
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newGridSpan, setNewGridSpan] = useState('1x1');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadId, setTargetUploadId] = useState<string | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Compresión WebP en el navegador
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas no soportado'));
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Fallo al comprimir'));
            },
            'image/webp',
            0.85
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageFile = async (file: File, categoryId?: string) => {
    if (!file.type.startsWith('image/')) {
      alert('Solo se admiten archivos de imagen');
      return;
    }

    try {
      setIsUploading(categoryId || 'new');
      const compressedBlob = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressedBlob, 'category.webp');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al subir la imagen');
      const data = await res.json();

      if (categoryId) {
        const cat = categories.find((c) => c.id === categoryId);
        if (cat) {
          const form = new FormData();
          form.append('id', cat.id);
          form.append('name', cat.name);
          form.append('slug', cat.slug);
          form.append('imageUrl', data.url);
          form.append('gridSpan', cat.gridSpan);
          form.append('displayOrder', cat.displayOrder.toString());
          await updateCategory(form);

          setCategories((prev) =>
            prev.map((c) => (c.id === categoryId ? { ...c, imageUrl: data.url } : c))
          );
        }
      } else {
        setNewImageUrl(data.url);
      }
    } catch (err: any) {
      alert('Error al subir imagen: ' + err.message);
    } finally {
      setIsUploading(null);
    }
  };

  const handleGridSpanChange = async (id: string, newSpan: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, gridSpan: newSpan } : c))
    );
    await updateCategoryGrid(id, newSpan);
  };

  const handleMoveOrder = async (id: string, dir: 'up' | 'down') => {
    await updateCategoryOrder(id, dir);
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return;
    const targetIndex = dir === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;
    setCategories(newCats);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // --- DRAG AND DROP (Reordenar) ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;

    const fromIndex = categories.findIndex((c) => c.id === draggedId);
    const toIndex = categories.findIndex((c) => c.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const newCats = [...categories];
    const [moved] = newCats.splice(fromIndex, 1);
    newCats.splice(toIndex, 0, moved);

    setCategories(newCats);
    setDraggedId(null);

    // Guardar nuevo orden persistente en backend
    await reorderCategories(newCats.map((c) => c.id));
  };

  // --- RESIZE CON ESQUINAS (Estirar) ---
  const startResizing = (
    e: React.MouseEvent,
    id: string,
    mode: 'both' | 'col' | 'row',
    cardEl: HTMLElement
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const cat = categories.find((c) => c.id === id);
    if (!cat) return;

    const norm = normalizeSpan(cat.gridSpan);
    const match = norm.match(/(\d+)x(\d+)/);
    const startCols = match ? parseInt(match[1], 10) : 1;
    const startRows = match ? parseInt(match[2], 10) : 1;

    setResizingState({
      id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCols,
      startRows,
      cardRect: cardEl.getBoundingClientRect(),
    });
  };

  useEffect(() => {
    if (!resizingState) return;

    const onMouseMove = (e: MouseEvent) => {
      const { id, mode, startX, startY, startCols, startRows, cardRect } = resizingState;

      // Ancho aproximado de 1 columna (el ancho actual de la tarjeta dividido entre sus columnas iniciales)
      const approxColWidth = Math.max(cardRect.width / Math.max(startCols, 1), 160);
      const approxRowHeight = 220; // Altura estándar del grid row

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newCols = startCols;
      let newRows = startRows;

      if (mode === 'both' || mode === 'col') {
        const addedCols = Math.round(deltaX / approxColWidth);
        newCols = Math.min(Math.max(startCols + addedCols, 1), 4);
      }

      if (mode === 'both' || mode === 'row') {
        const addedRows = Math.round(deltaY / (approxRowHeight * 0.7));
        newRows = Math.min(Math.max(startRows + addedRows, 1), 3);
      }

      const newSpan = `${newCols}x${newRows}`;

      setCategories((prev) =>
        prev.map((c) => (c.id === id && c.gridSpan !== newSpan ? { ...c, gridSpan: newSpan } : c))
      );
    };

    const onMouseUp = async () => {
      const { id } = resizingState;
      setResizingState(null);

      const target = categories.find((c) => c.id === id);
      if (target) {
        await updateCategoryGrid(id, target.gridSpan);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingState, categories]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;

    setIsSaving(true);
    const form = new FormData();
    form.append('name', newName.trim());
    form.append('slug', newSlug.trim());
    form.append('imageUrl', newImageUrl.trim());
    form.append('gridSpan', newGridSpan);

    const res = await createCategory(form);
    setIsSaving(false);

    if (res.success) {
      setNewName('');
      setNewSlug('');
      setNewImageUrl('');
      setIsCreating(false);
      window.location.reload();
    } else {
      alert(res.error || 'Error creando la categoría');
    }
  };

  return (
    <div className="space-y-8 select-none">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0] && targetUploadId) {
            handleImageFile(e.target.files[0], targetUploadId);
          }
        }}
        className="hidden"
      />

      {/* Barra de Acciones Superior */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Editor Visual de Layout en Grid (Drag & Drop + Estirar Esquinas)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            <strong>Arrastra</strong> las tarjetas para reordenarlas libremente, o <strong>jala la esquina inferior derecha</strong> para estirar su ancho y alto en el grid.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
        >
          {isCreating ? '✕ Cancelar' : '+ Nueva Categoría'}
        </button>
      </div>

      {/* FORMULARIO DE NUEVA CATEGORÍA */}
      {isCreating && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-md space-y-5 animate-in fade-in"
        >
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-base">Crear Nueva Categoría</h3>
            <p className="text-xs text-gray-500">Agrega un título, foto de portada y define su tamaño inicial en el grid.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Nombre</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newSlug) {
                    setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }
                }}
                placeholder="Ej. Prints & Ilustraciones"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Slug (URL)</label>
              <input
                type="text"
                required
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="prints-ilustraciones"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-mono text-xs focus:border-black focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Tamaño en el Grid</label>
              <select
                value={newGridSpan}
                onChange={(e) => setNewGridSpan(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black focus:ring-black font-medium"
              >
                {GRID_PRESETS.map((span) => (
                  <option key={span.id} value={span.id}>
                    {span.label} ({span.cols} cols × {span.rows} filas)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Imagen de Portada</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... o sube una imagen"
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono"
              />
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition-colors flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {isUploading === 'new' ? 'Subiendo WebP...' : 'Subir Imagen'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 shadow-sm disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      )}

      {/* GRID INTERACTIVO EN TIEMPO REAL CON DRAG & DROP Y ESQUINAS PARA ESTIRAR */}
      <div className="bg-gray-100/70 p-6 rounded-3xl border border-gray-200" ref={gridContainerRef}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Vista Previa Dinámica del Grid ({categories.length} categorías)
            </span>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Arrastra para reordenar / Jala esquinas para estirar
            </span>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            1 a 4 columnas • 1 a 3 filas por tarjeta
          </span>
        </div>

        {categories.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
            No hay categorías registradas. Haz clic en "+ Nueva Categoría" arriba.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[220px]">
            {categories.map((cat, idx) => {
              const currentNormalized = normalizeSpan(cat.gridSpan);
              const spanMatch = currentNormalized.match(/(\d+)x(\d+)/);
              const spanCols = spanMatch ? parseInt(spanMatch[1], 10) : 1;
              const spanRows = spanMatch ? parseInt(spanMatch[2], 10) : 1;
              const minH = spanRows === 1 ? 220 : spanRows === 2 ? 460 : 700;

              const isBeingDragged = draggedId === cat.id;
              const isDragTarget = dragOverId === cat.id;
              const isBeingResized = resizingState?.id === cat.id;

              return (
                <div
                  key={cat.id}
                  id={`cat-card-${cat.id}`}
                  draggable={!resizingState}
                  onDragStart={(e) => handleDragStart(e, cat.id)}
                  onDragOver={(e) => handleDragOver(e, cat.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cat.id)}
                  style={{ minHeight: `${minH}px` }}
                  className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col justify-between p-5 bg-gray-900 ${getGridSpanClasses(
                    cat.gridSpan
                  )} ${
                    isBeingDragged
                      ? 'opacity-40 scale-95 border-dashed border-indigo-400'
                      : isDragTarget
                      ? 'ring-4 ring-indigo-500 border-indigo-500 scale-[1.02] shadow-2xl'
                      : isBeingResized
                      ? 'ring-4 ring-emerald-400 shadow-2xl'
                      : 'border-gray-300/80 shadow-md hover:shadow-xl'
                  }`}
                >
                  {/* Imagen de Fondo */}
                  {cat.imageUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url('${cat.imageUrl}')` }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <span className="text-gray-600 font-mono text-xs">Sin imagen</span>
                    </div>
                  )}

                  {/* Overlay oscuro para contraste perfecto */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 group-hover:via-black/50 transition-colors" />

                  {/* Cabecera de la Tarjeta: Grip de Arrastre, Orden y Botones */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Grip Drag & Drop */}
                      <span
                        title="Arrastra para acomodar esta categoría"
                        className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/90 backdrop-blur-md border border-white/20 flex items-center gap-1 text-[11px] font-bold"
                      >
                        <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="9" cy="6" r="2" />
                          <circle cx="9" cy="12" r="2" />
                          <circle cx="9" cy="18" r="2" />
                          <circle cx="15" cy="6" r="2" />
                          <circle cx="15" cy="12" r="2" />
                          <circle cx="15" cy="18" r="2" />
                        </svg>
                        <span>#{idx + 1}</span>
                      </span>

                      {/* Badge con dimensión actual */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-900/80 text-indigo-200 border border-indigo-400/30">
                        {spanCols} col × {spanRows} fila
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 opacity-90 group-hover:opacity-100 transition-opacity">
                      {/* Subir foto */}
                      <button
                        type="button"
                        onClick={() => {
                          setTargetUploadId(cat.id);
                          fileInputRef.current?.click();
                        }}
                        title="Cambiar imagen"
                        className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors text-xs flex items-center justify-center"
                      >
                        {isUploading === cat.id ? (
                          <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-white/60 border-t-white rounded-full" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        )}
                      </button>

                      {/* Mover orden con botones */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveOrder(cat.id, 'up')}
                        title="Mover antes"
                        className="p-1 rounded text-white/70 hover:text-white disabled:opacity-30 text-xs"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMoveOrder(cat.id, 'down')}
                        title="Mover después"
                        className="p-1 rounded text-white/70 hover:text-white disabled:opacity-30 text-xs"
                      >
                        →
                      </button>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        title="Eliminar categoría"
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-500/30 transition-colors text-xs flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Pie de la Tarjeta: Título y Controles */}
                  <div className="relative z-10 space-y-2.5">
                    <div>
                      <h3 className="text-xl font-bold text-white drop-shadow-md tracking-tight">
                        {cat.name}
                      </h3>
                    </div>

                    {/* Selector de Tamaño */}
                    <div className="bg-black/85 backdrop-blur-md p-2 rounded-xl border border-white/15 space-y-1.5">
                      <div className="text-[10px] font-semibold text-white/70 uppercase tracking-wider flex items-center justify-between">
                        <span>Tamaño ({currentNormalized})</span>
                        <select
                          value={currentNormalized}
                          onChange={(e) => handleGridSpanChange(cat.id, e.target.value)}
                          className="bg-black/90 text-indigo-300 text-[11px] font-bold border border-white/20 rounded-md px-1.5 py-0.5 focus:outline-none"
                        >
                          {GRID_PRESETS.map((p) => (
                            <option key={p.id} value={p.id} className="bg-gray-900 text-white">
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Botones de Acceso Rápido */}
                      <div className="grid grid-cols-5 gap-1">
                        {['1x1', '2x1', '2x2', '3x1', '4x1'].map((presetId) => (
                          <button
                            key={presetId}
                            type="button"
                            onClick={() => handleGridSpanChange(cat.id, presetId)}
                            className={`py-1 px-1 rounded-md text-[10px] font-bold transition-all text-center ${
                              currentNormalized === presetId
                                ? 'bg-white text-black shadow-sm scale-105'
                                : 'bg-white/10 text-white/80 hover:bg-white/25 hover:text-white'
                            }`}
                          >
                            {presetId}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ============================================================== */}
                  {/* MANIJAS INTERACTIVAS PARA ESTIRAR CON EL MOUSE (ESQUINAS) */}
                  {/* ============================================================== */}

                  {/* 1. Borde derecho: Estirar columnas horizontalmente */}
                  <div
                    onMouseDown={(e) => {
                      const el = document.getElementById(`cat-card-${cat.id}`);
                      if (el) startResizing(e, cat.id, 'col', el);
                    }}
                    title="Arrastra para estirar ancho en columnas (1 a 4)"
                    className="absolute top-1/2 right-0 -translate-y-1/2 z-30 h-16 w-3 hover:w-4 bg-indigo-500/0 hover:bg-indigo-500/80 cursor-ew-resize transition-all rounded-l-md flex items-center justify-center group/ew"
                  >
                    <span className="hidden group-hover/ew:block w-1 h-6 bg-white rounded-full shadow" />
                  </div>

                  {/* 2. Borde inferior: Estirar filas verticalmente */}
                  <div
                    onMouseDown={(e) => {
                      const el = document.getElementById(`cat-card-${cat.id}`);
                      if (el) startResizing(e, cat.id, 'row', el);
                    }}
                    title="Arrastra para estirar alto en filas (1 a 3)"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 z-30 w-16 h-3 hover:h-4 bg-indigo-500/0 hover:bg-indigo-500/80 cursor-ns-resize transition-all rounded-t-md flex items-center justify-center group/ns"
                  >
                    <span className="hidden group-hover/ns:block h-1 w-6 bg-white rounded-full shadow" />
                  </div>

                  {/* 3. ESQUINA INFERIOR DERECHA: Estirar ambas dimensiones simultáneamente */}
                  <div
                    onMouseDown={(e) => {
                      const el = document.getElementById(`cat-card-${cat.id}`);
                      if (el) startResizing(e, cat.id, 'both', el);
                    }}
                    title="Jala esta esquina para estirar columnas y filas libremente"
                    className="absolute bottom-1 right-1 z-30 flex items-center justify-center h-8 w-8 rounded-xl bg-indigo-600/90 text-white hover:bg-indigo-500 hover:scale-110 active:scale-95 cursor-nwse-resize shadow-lg transition-transform border border-white/30 backdrop-blur-md"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 13v6m0 0h-6m6 0l-8-8m-3 3v4m0 0h-4m4 0l-5-5" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
