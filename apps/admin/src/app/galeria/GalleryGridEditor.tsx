'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoredMediaItem } from '@esqueleto/core';
import {
  GALLERY_PRESETS,
  autoArrangeGalleryGrid,
  formatGridSpan,
  normalizeGalleryColumns,
  parseGridSpan,
  type GalleryColumnCount,
} from '@esqueleto/core/grid';
import { saveGalleryGridLayoutAction } from './actions';

interface PlacedMedia extends StoredMediaItem {
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
  isPlaced: boolean;
}

interface GridRect {
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
}

interface GalleryGridEditorProps {
  visibleItems: StoredMediaItem[];
  initialColumns: GalleryColumnCount;
  onLayoutSaved: (
    nextCols: GalleryColumnCount,
    updates: { id: string; gridSpan: string; displayOrder: number }[]
  ) => void;
}

// Paleta de fondos distintos para facilitar identificar y elegir bloques visuales
const BLOCK_BACKGROUNDS = [
  'bg-rose-100 border-rose-400',
  'bg-amber-100 border-amber-400',
  'bg-emerald-100 border-emerald-400',
  'bg-sky-100 border-sky-400',
  'bg-violet-100 border-violet-400',
  'bg-teal-100 border-teal-400',
  'bg-orange-100 border-orange-400',
  'bg-fuchsia-100 border-fuchsia-400',
];

const BLOCK_BADGE_COLORS = [
  'bg-rose-600 text-white',
  'bg-amber-600 text-white',
  'bg-emerald-600 text-white',
  'bg-sky-600 text-white',
  'bg-violet-600 text-white',
  'bg-teal-600 text-white',
  'bg-orange-600 text-white',
  'bg-fuchsia-600 text-white',
];

function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return !(
    a.colStart + a.colSpan - 1 < b.colStart ||
    a.colStart > b.colStart + b.colSpan - 1 ||
    a.rowStart + a.rowSpan - 1 < b.rowStart ||
    a.rowStart > b.rowStart + b.rowSpan - 1
  );
}

function findFirstAvailableSlot(
  occupied: GridRect[],
  colSpan: number,
  rowSpan: number,
  totalCols: number,
  totalRows: number
): { colStart: number; rowStart: number } {
  const clampedColSpan = Math.min(Math.max(colSpan, 1), totalCols);
  for (let r = 1; r <= Math.max(totalRows, 30); r++) {
    for (let c = 1; c <= totalCols - clampedColSpan + 1; c++) {
      const candidate: GridRect = {
        colStart: c,
        rowStart: r,
        colSpan: clampedColSpan,
        rowSpan,
      };
      if (!occupied.some((occ) => rectsOverlap(candidate, occ))) {
        return { colStart: c, rowStart: r };
      }
    }
  }
  return { colStart: 1, rowStart: 1 };
}

function resolveCollisionsAndReflow(
  allItems: PlacedMedia[],
  pinned: PlacedMedia,
  previousRect: GridRect,
  totalCols: number,
  totalRows: number
): PlacedMedia[] {
  const placedResult: PlacedMedia[] = [
    {
      ...pinned,
      gridSpan: formatGridSpan(
        pinned.colSpan,
        pinned.rowSpan,
        pinned.colStart,
        pinned.rowStart,
        totalCols,
        totalRows
      ),
    },
  ];

  const othersPlaced = allItems.filter((i) => i.isPlaced && i.id !== pinned.id);
  const colliding: PlacedMedia[] = [];

  for (const item of othersPlaced) {
    if (rectsOverlap(pinned, item)) {
      colliding.push(item);
    } else {
      placedResult.push(item);
    }
  }

  for (const item of colliding) {
    const colSpan = Math.min(Math.max(item.colSpan, 1), totalCols);
    const rowSpan = Math.min(Math.max(item.rowSpan, 1), Math.max(totalRows, 16));

    const swapColStart = Math.min(Math.max(previousRect.colStart, 1), totalCols - colSpan + 1);
    const swapRowStart = Math.max(previousRect.rowStart, 1);
    const swapCandidate: GridRect = {
      colStart: swapColStart,
      rowStart: swapRowStart,
      colSpan,
      rowSpan,
    };

    if (!placedResult.some((occ) => rectsOverlap(swapCandidate, occ))) {
      placedResult.push({
        ...item,
        colStart: swapColStart,
        rowStart: swapRowStart,
        colSpan,
        rowSpan,
        gridSpan: formatGridSpan(colSpan, rowSpan, swapColStart, swapRowStart, totalCols, totalRows),
      });
    } else {
      const slot = findFirstAvailableSlot(placedResult, colSpan, rowSpan, totalCols, totalRows);
      placedResult.push({
        ...item,
        colStart: slot.colStart,
        rowStart: slot.rowStart,
        colSpan,
        rowSpan,
        gridSpan: formatGridSpan(colSpan, rowSpan, slot.colStart, slot.rowStart, totalCols, totalRows),
      });
    }
  }

  const unplaced = allItems.filter((i) => !i.isPlaced && i.id !== pinned.id);
  return [...placedResult, ...unplaced];
}

function buildPlacedList(items: StoredMediaItem[], totalCols: number): PlacedMedia[] {
  const occupied: GridRect[] = [];
  const sorted = [...items].sort((a, b) => {
    const oA = a.displayOrder > 0 ? a.displayOrder : 99999;
    const oB = b.displayOrder > 0 ? b.displayOrder : 99999;
    return oA - oB;
  });

  const maxEstRows = Math.max(4, Math.ceil(sorted.length * 1.6));

  return sorted.map((item) => {
    const parsed = parseGridSpan(item.gridSpan);
    const colSpan = Math.min(Math.max(parsed.colSpan, 1), totalCols);
    const rowSpan = Math.min(Math.max(parsed.rowSpan, 1), 6);

    let colStart = parsed.colStart ? Math.min(Math.max(parsed.colStart, 1), totalCols - colSpan + 1) : null;
    let rowStart = parsed.rowStart ? Math.max(parsed.rowStart, 1) : null;

    if (
      colStart === null ||
      rowStart === null ||
      occupied.some((occ) =>
        rectsOverlap({ colStart: colStart!, rowStart: rowStart!, colSpan, rowSpan }, occ)
      )
    ) {
      const slot = findFirstAvailableSlot(occupied, colSpan, rowSpan, totalCols, maxEstRows);
      colStart = slot.colStart;
      rowStart = slot.rowStart;
    }

    const rect: GridRect = { colStart, rowStart, colSpan, rowSpan };
    occupied.push(rect);

    return {
      ...item,
      colStart,
      rowStart,
      colSpan,
      rowSpan,
      isPlaced: true,
    };
  });
}

export default function GalleryGridEditor({
  visibleItems,
  initialColumns,
  onLayoutSaved,
}: GalleryGridEditorProps) {
  const [cols, setCols] = useState<GalleryColumnCount>(() => normalizeGalleryColumns(initialColumns));
  const [placed, setPlaced] = useState<PlacedMedia[]>(() =>
    buildPlacedList(visibleItems, normalizeGalleryColumns(initialColumns))
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [cellHeight, setCellHeight] = useState(140);
  const [dragState, setDragState] = useState<{
    id: string;
    grabOffsetCol: number;
    grabOffsetRow: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{ id: string } | null>(null);
  const [activeSlotPicker, setActiveSlotPicker] = useState<{ colStart: number; rowStart: number } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const latestPlacedRef = useRef<PlacedMedia[]>(placed);
  latestPlacedRef.current = placed;

  // Sincronizar si el admin activó/ocultó nuevas fotos desde la pestaña Biblioteca
  useEffect(() => {
    setPlaced((prev) => {
      const prevMap = new Map(prev.map((p) => [p.id, p]));
      const merged = visibleItems.map((item) => {
        const existing = prevMap.get(item.id);
        return existing ? { ...item, ...existing, gridSpan: item.gridSpan || existing.gridSpan } : item;
      });
      return buildPlacedList(merged, cols);
    });
  }, [visibleItems, cols]);

  const activeItems = useMemo(() => placed.filter((i) => i.isPlaced), [placed]);
  const unplacedItems = useMemo(() => placed.filter((i) => !i.isPlaced), [placed]);

  const effectiveRows = useMemo(() => {
    const maxEnd = activeItems.reduce(
      (acc, i) => Math.max(acc, i.rowStart + i.rowSpan - 1),
      Math.max(3, Math.ceil(activeItems.length / Math.max(cols, 1)))
    );
    return Math.max(3, maxEnd + 1);
  }, [activeItems, cols]);

  const persistLayout = useCallback(
    async (listToSave: PlacedMedia[], targetCols = cols, targetRows = effectiveRows) => {
      setSaveStatus('saving');
      const sortedPlaced = listToSave
        .filter((i) => i.isPlaced)
        .sort((a, b) => (a.rowStart !== b.rowStart ? a.rowStart - b.rowStart : a.colStart - b.colStart));
      const unplaced = listToSave.filter((i) => !i.isPlaced);
      const allOrdered = [...sortedPlaced, ...unplaced];

      const payload = allOrdered.map((item, idx) => ({
        id: item.id,
        gridSpan: item.isPlaced
          ? formatGridSpan(
              item.colSpan,
              item.rowSpan,
              item.colStart,
              item.rowStart,
              targetCols,
              targetRows
            )
          : formatGridSpan(item.colSpan, item.rowSpan),
        displayOrder: idx + 1,
      }));

      await saveGalleryGridLayoutAction(targetCols, payload);
      onLayoutSaved(targetCols, payload);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2200);
    },
    [cols, effectiveRows, onLayoutSaved]
  );

  const getCellFromClientXY = useCallback(
    (clientX: number, clientY: number) => {
      const board = boardRef.current;
      if (!board) return { col: 1, row: 1 };
      const rect = board.getBoundingClientRect();
      const gap = 14;
      const cellW = (rect.width - gap * (cols - 1)) / cols;
      const cellH = (rect.height - gap * (effectiveRows - 1)) / effectiveRows;
      const rawCol = Math.floor((clientX - rect.left) / (cellW + gap)) + 1;
      const rawRow = Math.floor((clientY - rect.top) / (cellH + gap)) + 1;
      return {
        col: Math.min(Math.max(rawCol, 1), cols),
        row: Math.min(Math.max(rawRow, 1), effectiveRows),
      };
    },
    [cols, effectiveRows]
  );

  useEffect(() => {
    if (!dragState && !resizeState) return;

    const onPointerMove = (e: PointerEvent) => {
      const { col, row } = getCellFromClientXY(e.clientX, e.clientY);

      if (dragState) {
        setPlaced((prev) => {
          const target = prev.find((i) => i.id === dragState.id);
          if (!target) return prev;
          const nextColStart = Math.min(
            Math.max(col - dragState.grabOffsetCol, 1),
            cols - target.colSpan + 1
          );
          const nextRowStart = Math.min(
            Math.max(row - dragState.grabOffsetRow, 1),
            Math.max(effectiveRows - target.rowSpan + 1, 1)
          );
          if (nextColStart === target.colStart && nextRowStart === target.rowStart) return prev;

          const prevRect: GridRect = {
            colStart: target.colStart,
            rowStart: target.rowStart,
            colSpan: target.colSpan,
            rowSpan: target.rowSpan,
          };
          return resolveCollisionsAndReflow(
            prev,
            { ...target, colStart: nextColStart, rowStart: nextRowStart },
            prevRect,
            cols,
            effectiveRows
          );
        });
      } else if (resizeState) {
        setPlaced((prev) => {
          const target = prev.find((i) => i.id === resizeState.id);
          if (!target) return prev;
          const nextColSpan = Math.min(
            Math.max(col - target.colStart + 1, 1),
            cols - target.colStart + 1
          );
          const nextRowSpan = Math.min(Math.max(row - target.rowStart + 1, 1), 6);
          if (nextColSpan === target.colSpan && nextRowSpan === target.rowSpan) return prev;

          const prevRect: GridRect = {
            colStart: target.colStart,
            rowStart: target.rowStart,
            colSpan: target.colSpan,
            rowSpan: target.rowSpan,
          };
          return resolveCollisionsAndReflow(
            prev,
            { ...target, colSpan: nextColSpan, rowSpan: nextRowSpan },
            prevRect,
            cols,
            effectiveRows
          );
        });
      }
    };

    const onPointerUp = async () => {
      setDragState(null);
      setResizeState(null);
      await persistLayout(latestPlacedRef.current);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState, resizeState, cols, effectiveRows, getCellFromClientXY, persistLayout]);

  const applyViewTransition = (updateFn: () => void) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(updateFn);
    } else {
      updateFn();
    }
  };

  // Algoritmo de Acomodo Automático Inteligente
  const handleAutoArrange = async (targetCols: GalleryColumnCount = cols) => {
    const arranged = autoArrangeGalleryGrid(visibleItems, targetCols);
    const arrangedMap = new Map(arranged.map((a) => [a.id, a]));

    const nextPlaced: PlacedMedia[] = visibleItems.map((item, idx) => {
      const slot = arrangedMap.get(item.id);
      if (!slot) {
        return {
          ...item,
          colStart: 1,
          rowStart: idx + 1,
          colSpan: 1,
          rowSpan: 1,
          isPlaced: true,
        };
      }
      return {
        ...item,
        colStart: slot.colStart,
        rowStart: slot.rowStart,
        colSpan: slot.colSpan,
        rowSpan: slot.rowSpan,
        gridSpan: slot.gridSpan,
        displayOrder: slot.displayOrder,
        isPlaced: true,
      };
    });

    applyViewTransition(() => {
      setCols(targetCols);
      setPlaced(nextPlaced);
    });
    setStatusMessage(
      `Acomodo automático aplicado en ${targetCols} columnas para ${nextPlaced.length} fotografías.`
    );
    await persistLayout(nextPlaced, targetCols);
  };

  const handleChangeColumns = async (nextCols: GalleryColumnCount) => {
    if (nextCols === cols) return;
    await handleAutoArrange(nextCols);
  };

  const handleApplyPreset = async (id: string, presetId: string) => {
    const target = placed.find((i) => i.id === id);
    if (!target) return;
    const parsed = parseGridSpan(presetId);
    const nextColSpan = Math.min(Math.max(parsed.colSpan, 1), cols);
    const nextRowSpan = Math.min(Math.max(parsed.rowSpan, 1), 6);
    const nextColStart = Math.min(target.colStart, cols - nextColSpan + 1);

    const prevRect: GridRect = {
      colStart: target.colStart,
      rowStart: target.rowStart,
      colSpan: target.colSpan,
      rowSpan: target.rowSpan,
    };

    const updated = resolveCollisionsAndReflow(
      placed,
      {
        ...target,
        colStart: nextColStart,
        colSpan: nextColSpan,
        rowSpan: nextRowSpan,
      },
      prevRect,
      cols,
      effectiveRows
    );

    applyViewTransition(() => setPlaced(updated));
    await persistLayout(updated);
  };

  const handleQuickResize = async (id: string, deltaCol: number, deltaRow: number) => {
    const target = placed.find((i) => i.id === id);
    if (!target) return;

    const nextColSpan = Math.min(Math.max(target.colSpan + deltaCol, 1), cols - target.colStart + 1);
    const nextRowSpan = Math.min(Math.max(target.rowSpan + deltaRow, 1), 6);
    if (nextColSpan === target.colSpan && nextRowSpan === target.rowSpan) return;

    const prevRect: GridRect = {
      colStart: target.colStart,
      rowStart: target.rowStart,
      colSpan: target.colSpan,
      rowSpan: target.rowSpan,
    };

    const updated = resolveCollisionsAndReflow(
      placed,
      { ...target, colSpan: nextColSpan, rowSpan: nextRowSpan },
      prevRect,
      cols,
      effectiveRows
    );

    setPlaced(updated);
    await persistLayout(updated);
  };

  const handleRemoveFromBoard = (id: string) => {
    setPlaced((prev) => prev.map((i) => (i.id === id ? { ...i, isPlaced: false } : i)));
  };

  const handlePlaceItemAtCell = async (id: string, colStart: number, rowStart: number) => {
    const target = placed.find((i) => i.id === id);
    if (!target) return;
    const colSpan = Math.min(target.colSpan, cols - colStart + 1);
    const prevRect: GridRect = {
      colStart,
      rowStart,
      colSpan,
      rowSpan: target.rowSpan,
    };
    const updated = resolveCollisionsAndReflow(
      placed,
      { ...target, isPlaced: true, colStart, rowStart, colSpan },
      prevRect,
      cols,
      effectiveRows
    );
    setPlaced(updated);
    setActiveSlotPicker(null);
    await persistLayout(updated);
  };

  const emptyCells = useMemo(() => {
    const cells: { col: number; row: number }[] = [];
    for (let r = 1; r <= effectiveRows; r++) {
      for (let c = 1; c <= cols; c++) {
        const covered = activeItems.some(
          (item) =>
            c >= item.colStart &&
            c <= item.colStart + item.colSpan - 1 &&
            r >= item.rowStart &&
            r <= item.rowStart + item.rowSpan - 1
        );
        if (!covered) cells.push({ col: c, row: r });
      }
    }
    return cells;
  }, [activeItems, cols, effectiveRows]);

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50/70 p-10 text-center space-y-2">
        <h3 className="text-base font-extrabold text-gray-900">
          Aún no hay fotografías activas para la galería pública
        </h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Ve a la pestaña <strong>Biblioteca &amp; Subida</strong> y activa el interruptor{' '}
          <strong>&ldquo;Mostrar en Galería&rdquo;</strong> en las fotografías que deseas exhibir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Región accesible para anunciar reordenamientos (modern-web-guidance: dynamic-sort) */}
      <p role="status" className="sr-only">
        {statusMessage}
      </p>

      {/* Barra superior de columnas y Acomodo Automático */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 p-1 border border-gray-200">
            <span className="px-2 text-xs font-bold text-gray-600">Columnas:</span>
            {([3, 4, 5] as GalleryColumnCount[]).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cols === c}
                onClick={() => handleChangeColumns(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  cols === c
                    ? 'bg-black text-white shadow-xs'
                    : 'text-gray-700 hover:bg-white'
                }`}
              >
                {c} {c === 4 ? 'Cols (Defecto)' : 'Cols'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <label htmlFor="gallery-row-height" className="font-semibold">
              Alto celda:
            </label>
            <input
              id="gallery-row-height"
              type="range"
              min={110}
              max={220}
              step={10}
              value={cellHeight}
              onChange={(e) => setCellHeight(Number(e.target.value))}
              className="w-24 accent-black"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {saveStatus === 'saving' && (
            <span className="text-xs font-semibold text-amber-600">Guardando orden...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs font-bold text-emerald-600">Layout guardado</span>
          )}

          <button
            type="button"
            onClick={() => handleAutoArrange(cols)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 text-xs font-extrabold shadow-sm transition-all active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1v-8zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
            </svg>
            Acomodo Automático Inteligente
          </button>

          <button
            type="button"
            onClick={() => persistLayout(placed)}
            className="rounded-xl bg-black hover:bg-gray-800 text-white px-4 py-2 text-xs font-bold transition-colors"
          >
            Guardar Layout
          </button>
        </div>
      </div>

      {/* Lienzo 2D Interactivo */}
      <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm overflow-x-auto">
        <div
          ref={boardRef}
          className="relative grid min-w-[640px] select-none"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${effectiveRows}, ${cellHeight}px)`,
            gap: '14px',
          }}
        >
          {/* Celdas vacías '+' */}
          {emptyCells.map((cell) => (
            <button
              key={`empty-${cell.col}-${cell.row}`}
              type="button"
              style={{
                gridColumn: `${cell.col} / span 1`,
                gridRow: `${cell.row} / span 1`,
              }}
              onClick={() => {
                if (unplacedItems.length > 0) {
                  setActiveSlotPicker({ colStart: cell.col, rowStart: cell.row });
                }
              }}
              className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/70 hover:border-indigo-300 hover:bg-indigo-50/40 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors"
              title={
                unplacedItems.length > 0
                  ? 'Colocar fotografía pendiente aquí'
                  : `Celda libre (${cell.col}, ${cell.row})`
              }
            >
              <span className="text-lg font-bold leading-none">+</span>
              <span className="text-[10px] font-mono mt-1">
                C{cell.col}·F{cell.row}
              </span>
            </button>
          ))}

          {/* Bloques de fotografías con fondo cromático distinto */}
          {activeItems.map((item, idx) => {
            const bgClass = BLOCK_BACKGROUNDS[idx % BLOCK_BACKGROUNDS.length];
            const badgeClass = BLOCK_BADGE_COLORS[idx % BLOCK_BADGE_COLORS.length];
            const sizeId = `${item.colSpan}x${item.rowSpan}`;
            return (
              <div
                key={item.id}
                onPointerDown={(e) => {
                  const targetEl = e.target as HTMLElement;
                  if (targetEl.closest('[data-no-drag="true"]') || ['SELECT', 'BUTTON', 'OPTION'].includes(targetEl.tagName)) {
                    return;
                  }
                  e.preventDefault();
                  const { col, row } = getCellFromClientXY(e.clientX, e.clientY);
                  setDragState({
                    id: item.id,
                    grabOffsetCol: Math.max(0, col - item.colStart),
                    grabOffsetRow: Math.max(0, row - item.rowStart),
                  });
                }}
                style={{
                  gridColumn: `${item.colStart} / span ${item.colSpan}`,
                  gridRow: `${item.rowStart} / span ${item.rowSpan}`,
                }}
                className={`vt-gallery-item relative rounded-2xl border-2 p-2.5 shadow-sm overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg ${bgClass}`}
              >
                {/* Foto dentro del marco con su fondo distinto visible alrededor */}
                <div className="relative flex-1 min-h-0 w-full overflow-hidden rounded-xl bg-white/60 border border-black/10">
                  <img
                    src={item.url}
                    alt={item.title || item.originalName}
                    loading="lazy"
                    draggable={false}
                    className="h-full w-full object-cover pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />
                </div>

                {/* Top bar: Número único y quitar del lienzo */}
                <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2 pointer-events-none">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold shadow-sm ${badgeClass}`}>
                    #{idx + 1} · {sizeId}
                  </span>
                  <button
                    type="button"
                    data-no-drag="true"
                    aria-label="Quitar del tablero"
                    onClick={() => handleRemoveFromBoard(item.id)}
                    className="pointer-events-auto h-6 w-6 rounded-full bg-black/75 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center shadow-sm transition-colors"
                    title="Quitar del tablero temporalmente"
                  >
                    ×
                  </button>
                </div>

                {/* Controles de formato predeterminado y Ancho/Alto */}
                <div
                  data-no-drag="true"
                  className="mt-2 relative z-20 flex flex-wrap items-center justify-between gap-1.5 text-[11px]"
                >
                  <select
                    aria-label="Formato predeterminado"
                    value={sizeId}
                    onChange={(e) => handleApplyPreset(item.id, e.target.value)}
                    className="rounded-lg border border-black/20 bg-white/95 px-2 py-1 text-[11px] font-bold text-gray-900 shadow-2xs max-w-[130px]"
                  >
                    {GALLERY_PRESETS.filter((p) => p.cols <= cols).map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                    {!GALLERY_PRESETS.some((p) => p.id === sizeId) && (
                      <option value={sizeId}>Personalizado ({sizeId})</option>
                    )}
                  </select>

                  <div className="flex items-center gap-1 rounded-lg bg-black/80 text-white px-1.5 py-0.5 font-mono">
                    <span>An</span>
                    <button
                      type="button"
                      onClick={() => handleQuickResize(item.id, -1, 0)}
                      className="w-4 h-4 rounded bg-white/20 hover:bg-white/35 font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold">{item.colSpan}</span>
                    <button
                      type="button"
                      onClick={() => handleQuickResize(item.id, 1, 0)}
                      className="w-4 h-4 rounded bg-white/20 hover:bg-white/35 font-bold"
                    >
                      +
                    </button>
                    <span className="opacity-40">|</span>
                    <span>Al</span>
                    <button
                      type="button"
                      onClick={() => handleQuickResize(item.id, 0, -1)}
                      className="w-4 h-4 rounded bg-white/20 hover:bg-white/35 font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold">{item.rowSpan}</span>
                    <button
                      type="button"
                      onClick={() => handleQuickResize(item.id, 0, 1)}
                      className="w-4 h-4 rounded bg-white/20 hover:bg-white/35 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Esquina '⌟' para estirar en 2D */}
                <div
                  data-no-drag="true"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setResizeState({ id: item.id });
                  }}
                  title="Arrastra para estirar ancho/alto"
                  className="absolute bottom-2 right-2 z-30 h-6 w-6 cursor-nwse-resize rounded-md bg-black/55 hover:bg-black flex items-end justify-end p-1"
                >
                  <span className="h-3 w-3 border-r-2 border-b-2 border-white" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fotos removidas temporalmente del tablero listas para re-colocar */}
      {unplacedItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-extrabold text-amber-950">
              Fotografías visibles pendientes de colocar en el tablero ({unplacedItems.length})
            </h4>
            <button
              type="button"
              onClick={() => handleAutoArrange(cols)}
              className="text-xs font-bold text-indigo-700 hover:underline"
            >
              Ubicarlas automáticamente
            </button>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {unplacedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const slot = findFirstAvailableSlot(
                    activeItems,
                    Math.min(item.colSpan, cols),
                    item.rowSpan,
                    cols,
                    effectiveRows + 4
                  );
                  handlePlaceItemAtCell(item.id, slot.colStart, slot.rowStart);
                }}
                className="flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-800 hover:border-black shadow-2xs"
              >
                <img src={item.url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                <span className="max-w-[140px] truncate">{item.title || item.originalName}</span>
                <span className="text-indigo-600">+ Colocar</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selector rápido si hizo clic en una celda '+' vacía */}
      {activeSlotPicker && unplacedItems.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-950">
              Elige qué fotografía colocar en Columna {activeSlotPicker.colStart}, Fila{' '}
              {activeSlotPicker.rowStart}:
            </span>
            <button
              type="button"
              onClick={() => setActiveSlotPicker(null)}
              className="text-xs font-bold text-gray-600 hover:text-black"
            >
              Cancelar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {unplacedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  handlePlaceItemAtCell(item.id, activeSlotPicker.colStart, activeSlotPicker.rowStart)
                }
                className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold hover:border-black"
              >
                <img src={item.url} alt="" className="h-7 w-7 rounded-md object-cover" />
                <span>{item.title || item.originalName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
