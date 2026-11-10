'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  createCategory,
  updateCategory,
  saveCategoryGridLayout,
  deleteCategory,
} from './actions';
import {
  parseGridSpan,
  formatGridSpan,
} from '@esqueleto/core/grid';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  gridSpan: string;
  displayOrder: number;
}

interface PlacedCategory extends CategoryItem {
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

interface CategoryGridManagerProps {
  categories: CategoryItem[];
}

function rectsOverlap(a: GridRect, b: GridRect): boolean {
  const aColEnd = a.colStart + a.colSpan - 1;
  const aRowEnd = a.rowStart + a.rowSpan - 1;
  const bColEnd = b.colStart + b.colSpan - 1;
  const bRowEnd = b.rowStart + b.rowSpan - 1;

  return !(
    aColEnd < b.colStart ||
    a.colStart > bColEnd ||
    aRowEnd < b.rowStart ||
    a.rowStart > bRowEnd
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
  for (let r = 1; r <= Math.max(totalRows, 20); r++) {
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

function detectInitialBoardSize(rawCategories: CategoryItem[]): { cols: number; rows: number } {
  let maxCols = 5;
  let maxRows = 6;

  for (const cat of rawCategories) {
    const parsed = parseGridSpan(cat.gridSpan);
    if (parsed.boardCols && parsed.boardRows) {
      return {
        cols: Math.min(Math.max(parsed.boardCols, 2), 10),
        rows: Math.min(Math.max(parsed.boardRows, 2), 12),
      };
    }
    const cEnd = (parsed.colStart || 1) + parsed.colSpan - 1;
    const rEnd = (parsed.rowStart || 1) + parsed.rowSpan - 1;
    if (cEnd > maxCols) maxCols = cEnd;
    if (rEnd + 1 > maxRows) maxRows = rEnd + 1;
  }

  return {
    cols: Math.min(Math.max(maxCols, 4), 10),
    rows: Math.min(Math.max(maxRows, 6), 12),
  };
}

function buildInitialPlaced(
  rawCategories: CategoryItem[],
  totalCols: number,
  totalRows: number
): PlacedCategory[] {
  const sorted = [...rawCategories].sort((a, b) => a.displayOrder - b.displayOrder);
  const placed: PlacedCategory[] = [];
  const deferred: { item: CategoryItem; colSpan: number; rowSpan: number }[] = [];

  for (const item of sorted) {
    const parsed = parseGridSpan(item.gridSpan);
    const colSpan = Math.min(Math.max(parsed.colSpan, 1), totalCols);
    const rowSpan = Math.min(Math.max(parsed.rowSpan, 1), totalRows);

    if (parsed.colStart !== null && parsed.rowStart !== null) {
      const colStart = Math.min(Math.max(parsed.colStart, 1), totalCols - colSpan + 1);
      const rowStart = Math.min(Math.max(parsed.rowStart, 1), totalRows - rowSpan + 1);
      const candidate: GridRect = { colStart, rowStart, colSpan, rowSpan };
      if (!placed.some((p) => p.isPlaced && rectsOverlap(candidate, p))) {
        placed.push({
          ...item,
          colStart,
          rowStart,
          colSpan,
          rowSpan,
          isPlaced: true,
          gridSpan: formatGridSpan(colSpan, rowSpan, colStart, rowStart, totalCols, totalRows),
        });
        continue;
      }
    }

    deferred.push({ item, colSpan, rowSpan });
  }

  for (const { item, colSpan, rowSpan } of deferred) {
    const slot = findFirstAvailableSlot(
      placed.filter((p) => p.isPlaced),
      colSpan,
      rowSpan,
      totalCols,
      totalRows
    );
    placed.push({
      ...item,
      colStart: slot.colStart,
      rowStart: slot.rowStart,
      colSpan,
      rowSpan,
      isPlaced: true,
      gridSpan: formatGridSpan(colSpan, rowSpan, slot.colStart, slot.rowStart, totalCols, totalRows),
    });
  }

  return placed;
}

export default function CategoryGridManager({
  categories: initialCategories,
}: CategoryGridManagerProps) {
  const initialBoard = useMemo(() => detectInitialBoardSize(initialCategories), [initialCategories]);
  const [cols, setCols] = useState<number>(initialBoard.cols);
  const [rows, setRows] = useState<number>(initialBoard.rows);
  const [gap, setGap] = useState<number>(8);
  const [showPhotosInGrid, setShowPhotosInGrid] = useState<boolean>(false);

  const [items, setItems] = useState<PlacedCategory[]>(() =>
    buildInitialPlaced(initialCategories, initialBoard.cols, initialBoard.rows)
  );

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'html' | 'css' | null>(null);

  // Interacción 1: Mover caja existente por el grid 2D
  const [dragState, setDragState] = useState<{
    id: string;
    grabOffsetCol: number;
    grabOffsetRow: number;
  } | null>(null);

  // Interacción 2: Estirar esquina inferior derecha '⌟' (como en cssgridgenerator.io)
  const [resizeState, setResizeState] = useState<{
    id: string;
    colStart: number;
    rowStart: number;
  } | null>(null);

  // Interacción 3: Clic o arrastrar sobre celdas grises '+' para crear/colocar caja
  const [drawState, setDrawState] = useState<{
    startCol: number;
    startRow: number;
    endCol: number;
    endRow: number;
  } | null>(null);

  // Modal para crear nueva categoría o editar existente
  const [pendingCellRect, setPendingCellRect] = useState<GridRect | null>(null);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  const [editingCat, setEditingCat] = useState<PlacedCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadId, setTargetUploadId] = useState<string | null>(null);
  const gridBoardRef = useRef<HTMLDivElement>(null);
  const latestItemsRef = useRef<PlacedCategory[]>(items);

  useEffect(() => {
    latestItemsRef.current = items;
  }, [items]);

  const activeItems = useMemo(() => items.filter((i) => i.isPlaced), [items]);
  const unplacedItems = useMemo(() => items.filter((i) => !i.isPlaced), [items]);

  // Guardar layout en el servidor
  const persistLayout = useCallback(
    async (listToSave: PlacedCategory[], boardCols = cols, boardRows = rows) => {
      setSaveStatus('saving');
      const placedOnly = listToSave
        .filter((i) => i.isPlaced)
        .sort((a, b) => (a.rowStart !== b.rowStart ? a.rowStart - b.rowStart : a.colStart - b.colStart));

      const unplacedOnly = listToSave.filter((i) => !i.isPlaced);
      const combined = [...placedOnly, ...unplacedOnly];

      const payload = combined.map((item, idx) => ({
        id: item.id,
        gridSpan: formatGridSpan(
          item.colSpan,
          item.rowSpan,
          item.colStart,
          item.rowStart,
          boardCols,
          boardRows
        ),
        displayOrder: idx + 1,
      }));

      await saveCategoryGridLayout(payload);
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2200);
    },
    [cols, rows]
  );

  // Calcular qué celda (col, row) está debajo del mouse
  const getCellFromClientXY = useCallback(
    (clientX: number, clientY: number): { col: number; row: number } => {
      const board = gridBoardRef.current;
      if (!board) return { col: 1, row: 1 };

      const rect = board.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      const cellWidth = (rect.width - gap * (cols - 1)) / cols;
      const cellHeight = (rect.height - gap * (rows - 1)) / rows;

      const rawCol = Math.floor(relX / (cellWidth + gap)) + 1;
      const rawRow = Math.floor(relY / (cellHeight + gap)) + 1;

      return {
        col: Math.min(Math.max(rawCol, 1), cols),
        row: Math.min(Math.max(rawRow, 1), rows),
      };
    },
    [cols, rows, gap]
  );

  // Eventos globales de mouse/pointer para arrastrar cajas, estirar esquinas '⌟' y dibujar en '+'
  useEffect(() => {
    if (!dragState && !resizeState && !drawState) return;

    const onPointerMove = (e: PointerEvent) => {
      const { col, row } = getCellFromClientXY(e.clientX, e.clientY);

      if (dragState) {
        setItems((prev) => {
          const target = prev.find((i) => i.id === dragState.id);
          if (!target) return prev;

          const nextColStart = Math.min(
            Math.max(col - dragState.grabOffsetCol, 1),
            cols - target.colSpan + 1
          );
          const nextRowStart = Math.min(
            Math.max(row - dragState.grabOffsetRow, 1),
            rows - target.rowSpan + 1
          );

          if (nextColStart === target.colStart && nextRowStart === target.rowStart) {
            return prev;
          }

          const candidateRect: GridRect = {
            colStart: nextColStart,
            rowStart: nextRowStart,
            colSpan: target.colSpan,
            rowSpan: target.rowSpan,
          };

          // En cssgridgenerator.io las demás cajas NO se mueven solas; solo se permite mover si no choca
          const collides = prev.some(
            (other) => other.isPlaced && other.id !== target.id && rectsOverlap(candidateRect, other)
          );

          if (collides) return prev;

          return prev.map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  colStart: nextColStart,
                  rowStart: nextRowStart,
                  gridSpan: formatGridSpan(
                    item.colSpan,
                    item.rowSpan,
                    nextColStart,
                    nextRowStart,
                    cols,
                    rows
                  ),
                }
              : item
          );
        });
      } else if (resizeState) {
        setItems((prev) => {
          const target = prev.find((i) => i.id === resizeState.id);
          if (!target) return prev;

          const nextColSpan = Math.min(
            Math.max(col - resizeState.colStart + 1, 1),
            cols - resizeState.colStart + 1
          );
          const nextRowSpan = Math.min(
            Math.max(row - resizeState.rowStart + 1, 1),
            rows - resizeState.rowStart + 1
          );

          if (nextColSpan === target.colSpan && nextRowSpan === target.rowSpan) {
            return prev;
          }

          const candidateRect: GridRect = {
            colStart: target.colStart,
            rowStart: target.rowStart,
            colSpan: nextColSpan,
            rowSpan: nextRowSpan,
          };

          // No permitir superponerse sobre otra caja existente al estirar
          const collides = prev.some(
            (other) => other.isPlaced && other.id !== target.id && rectsOverlap(candidateRect, other)
          );

          if (collides) return prev;

          return prev.map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  colSpan: nextColSpan,
                  rowSpan: nextRowSpan,
                  gridSpan: formatGridSpan(
                    nextColSpan,
                    nextRowSpan,
                    item.colStart,
                    item.rowStart,
                    cols,
                    rows
                  ),
                }
              : item
          );
        });
      } else if (drawState) {
        setDrawState((prev) =>
          prev && (prev.endCol !== col || prev.endRow !== row)
            ? { ...prev, endCol: col, endRow: row }
            : prev
        );
      }
    };

    const onPointerUp = async () => {
      if (dragState) {
        setDragState(null);
        await persistLayout(latestItemsRef.current);
      } else if (resizeState) {
        setResizeState(null);
        await persistLayout(latestItemsRef.current);
      } else if (drawState) {
        const colStart = Math.min(drawState.startCol, drawState.endCol);
        const colEnd = Math.max(drawState.startCol, drawState.endCol);
        const rowStart = Math.min(drawState.startRow, drawState.endRow);
        const rowEnd = Math.max(drawState.startRow, drawState.endRow);

        const drawnRect: GridRect = {
          colStart,
          rowStart,
          colSpan: colEnd - colStart + 1,
          rowSpan: rowEnd - rowStart + 1,
        };

        setDrawState(null);

        // Verificar que no choque con una caja ya colocada
        const overlapsExisting = latestItemsRef.current.some(
          (i) => i.isPlaced && rectsOverlap(drawnRect, i)
        );
        if (overlapsExisting) return;

        // Si hay una categoría sin colocar en espera, colocarla inmediatamente al hacer clic en '+' (como cssgridgenerator.io)
        const nextUnplaced = latestItemsRef.current.find((i) => !i.isPlaced);
        if (nextUnplaced) {
          const updated = latestItemsRef.current.map((item) =>
            item.id === nextUnplaced.id
              ? {
                  ...item,
                  colStart: drawnRect.colStart,
                  rowStart: drawnRect.rowStart,
                  colSpan: drawnRect.colSpan,
                  rowSpan: drawnRect.rowSpan,
                  isPlaced: true,
                  gridSpan: formatGridSpan(
                    drawnRect.colSpan,
                    drawnRect.rowSpan,
                    drawnRect.colStart,
                    drawnRect.rowStart,
                    cols,
                    rows
                  ),
                }
              : item
          );
          setItems(updated);
          await persistLayout(updated);
        } else {
          // Si todas las categorías ya están en el grid, abrir modal para crear nueva categoría en esa celda
          setPendingCellRect(drawnRect);
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState, resizeState, drawState, cols, rows, getCellFromClientXY, persistLayout]);

  // Quitar una caja del grid con el botón rosa 'X' (deja las celdas '+' libres como en cssgridgenerator.io)
  const handleRemoveFromGrid = async (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, isPlaced: false } : item
    );
    setItems(updated);
    await persistLayout(updated);
  };

  // Botón Reset (como en la esquina inferior derecha de cssgridgenerator.io)
  const handleResetGrid = async () => {
    // Limpia todas las cajas del lienzo para que todo quede con celdas '+' listas para colocar con 1 clic
    const cleared = items.map((item) => ({
      ...item,
      colSpan: 1,
      rowSpan: 1,
      isPlaced: false,
    }));
    setItems(cleared);
  };

  // Cambiar qué categoría ocupa una caja específica desde su selector interno
  const handleSwapCategoryInBox = async (currentCatId: string, targetCatId: string) => {
    if (currentCatId === targetCatId) return;
    const currentBox = items.find((i) => i.id === currentCatId);
    const targetBox = items.find((i) => i.id === targetCatId);
    if (!currentBox || !targetBox) return;

    const updated = items.map((item) => {
      if (item.id === currentCatId) {
        return {
          ...item,
          colStart: targetBox.colStart,
          rowStart: targetBox.rowStart,
          colSpan: targetBox.colSpan,
          rowSpan: targetBox.rowSpan,
          isPlaced: targetBox.isPlaced,
          gridSpan: formatGridSpan(
            targetBox.colSpan,
            targetBox.rowSpan,
            targetBox.colStart,
            targetBox.rowStart,
            cols,
            rows
          ),
        };
      }
      if (item.id === targetCatId) {
        return {
          ...item,
          colStart: currentBox.colStart,
          rowStart: currentBox.rowStart,
          colSpan: currentBox.colSpan,
          rowSpan: currentBox.rowSpan,
          isPlaced: true,
          gridSpan: formatGridSpan(
            currentBox.colSpan,
            currentBox.rowSpan,
            currentBox.colStart,
            currentBox.rowStart,
            cols,
            rows
          ),
        };
      }
      return item;
    });

    setItems(updated);
    await persistLayout(updated);
  };

  // Cambiar número de columnas o filas
  const handleUpdateBoardDimensions = async (nextCols: number, nextRows: number) => {
    const c = Math.min(Math.max(nextCols, 2), 10);
    const r = Math.min(Math.max(nextRows, 2), 12);
    setCols(c);
    setRows(r);

    const adjusted = items.map((item) => {
      const colSpan = Math.min(item.colSpan, c);
      const rowSpan = Math.min(item.rowSpan, r);
      const colStart = Math.min(item.colStart, c - colSpan + 1);
      const rowStart = Math.min(item.rowStart, r - rowSpan + 1);
      return {
        ...item,
        colStart,
        rowStart,
        colSpan,
        rowSpan,
        gridSpan: formatGridSpan(colSpan, rowSpan, colStart, rowStart, c, r),
      };
    });

    setItems(adjusted);
    await persistLayout(adjusted, c, r);
  };

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

      if (categoryId === 'edit-modal') {
        setEditImageUrl(data.url);
      } else if (categoryId) {
        const cat = items.find((c) => c.id === categoryId);
        if (cat) {
          const form = new FormData();
          form.append('id', cat.id);
          form.append('name', cat.name);
          form.append('slug', cat.slug);
          form.append('imageUrl', data.url);
          form.append('gridSpan', cat.gridSpan);
          form.append('displayOrder', cat.displayOrder.toString());
          await updateCategory(form);

          setItems((prev) =>
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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim() || !pendingCellRect) return;

    setIsSavingNew(true);
    const spanStr = formatGridSpan(
      pendingCellRect.colSpan,
      pendingCellRect.rowSpan,
      pendingCellRect.colStart,
      pendingCellRect.rowStart,
      cols,
      rows
    );

    const form = new FormData();
    form.append('name', newName.trim());
    form.append('slug', newSlug.trim());
    form.append('imageUrl', newImageUrl.trim());
    form.append('gridSpan', spanStr);

    const res = await createCategory(form);
    setIsSavingNew(false);

    if (res.success && res.category) {
      const created: PlacedCategory = {
        id: res.category.id,
        name: res.category.name,
        slug: res.category.slug,
        imageUrl: res.category.imageUrl,
        gridSpan: spanStr,
        displayOrder: items.length + 1,
        colStart: pendingCellRect.colStart,
        rowStart: pendingCellRect.rowStart,
        colSpan: pendingCellRect.colSpan,
        rowSpan: pendingCellRect.rowSpan,
        isPlaced: true,
      };
      const next = [...items, created];
      setItems(next);
      await persistLayout(next);
      setNewName('');
      setNewSlug('');
      setNewImageUrl('');
      setPendingCellRect(null);
    } else {
      alert(res.error || 'Error creando la categoría');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editName.trim() || !editSlug.trim()) return;

    setIsSavingEdit(true);
    const form = new FormData();
    form.append('id', editingCat.id);
    form.append('name', editName.trim());
    form.append('slug', editSlug.trim());
    form.append('imageUrl', editImageUrl.trim());
    form.append('gridSpan', editingCat.gridSpan);
    form.append('displayOrder', editingCat.displayOrder.toString());

    const res = await updateCategory(form);
    setIsSavingEdit(false);

    if (res.success) {
      setItems((prev) =>
        prev.map((c) =>
          c.id === editingCat.id
            ? {
                ...c,
                name: editName.trim(),
                slug: editSlug.trim().toLowerCase().replace(/\s+/g, '-'),
                imageUrl: editImageUrl.trim() || null,
              }
            : c
        )
      );
      setEditingCat(null);
    }
  };

  const handleDeletePermanent = async (id: string) => {
    if (!confirm('¿Eliminar permanentemente esta categoría de la tienda?')) return;
    await deleteCategory(id);
    setItems((prev) => prev.filter((c) => c.id !== id));
  };

  // Rectángulo activo al arrastrar sobre celdas '+'
  const activeDrawRect: GridRect | null = useMemo(() => {
    if (!drawState) return null;
    const colStart = Math.min(drawState.startCol, drawState.endCol);
    const colEnd = Math.max(drawState.startCol, drawState.endCol);
    const rowStart = Math.min(drawState.startRow, drawState.endRow);
    const rowEnd = Math.max(drawState.startRow, drawState.endRow);
    return {
      colStart,
      rowStart,
      colSpan: colEnd - colStart + 1,
      rowSpan: rowEnd - rowStart + 1,
    };
  }, [drawState]);

  // Código HTML y CSS en vivo idéntico a cssgridgenerator.io
  const generatedHtml = useMemo(() => {
    const inner = activeItems
      .map((item, idx) => `    <div class="div${idx + 1}">${idx + 1} (${item.name})</div>`)
      .join('\n');
    return `<div class="parent">\n${inner}\n</div>`;
  }, [activeItems]);

  const generatedCss = useMemo(() => {
    const parent = `.parent {\n    display: grid;\n    grid-template-columns: repeat(${cols}, 1fr);\n    grid-template-rows: repeat(${rows}, 1fr);\n    gap: ${gap}px;\n}`;
    const children = activeItems
      .map((c, idx) => {
        const lines: string[] = [];
        if (c.colSpan > 1) lines.push(`    grid-column: span ${c.colSpan} / span ${c.colSpan};`);
        if (c.rowSpan > 1) lines.push(`    grid-row: span ${c.rowSpan} / span ${c.rowSpan};`);
        lines.push(`    grid-column-start: ${c.colStart};`);
        lines.push(`    grid-row-start: ${c.rowStart};`);
        return `.div${idx + 1} {\n${lines.join('\n')}\n}`;
      })
      .join('\n\n');
    return `${parent}\n\n${children}`;
  }, [cols, rows, gap, activeItems]);

  return (
    <div className="space-y-6 select-none">
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

      {/* ==================================================================== */}
      {/* BARRA SUPERIOR DE PARÁMETROS (Columns, Rows, Gap + Acciones)         */}
      {/* ==================================================================== */}
      <div className="bg-[#f7f4ee] p-5 rounded-3xl border border-[#e2ddd3] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Columns */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-300 shadow-2xs">
            <label className="text-xs font-bold text-gray-700">Columns</label>
            <input
              type="number"
              min={2}
              max={10}
              value={cols}
              onChange={(e) => handleUpdateBoardDimensions( Number(e.target.value) || 4, rows )}
              className="w-14 text-center font-mono font-bold text-sm border border-gray-300 rounded-lg py-0.5 text-gray-900"
            />
          </div>

          {/* Rows */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-300 shadow-2xs">
            <label className="text-xs font-bold text-gray-700">Rows</label>
            <input
              type="number"
              min={2}
              max={12}
              value={rows}
              onChange={(e) => handleUpdateBoardDimensions(cols, Number(e.target.value) || 6)}
              className="w-14 text-center font-mono font-bold text-sm border border-gray-300 rounded-lg py-0.5 text-gray-900"
            />
          </div>

          {/* Gap */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-300 shadow-2xs">
            <label className="text-xs font-bold text-gray-700">Gap (px)</label>
            <input
              type="number"
              min={0}
              max={32}
              value={gap}
              onChange={(e) => setGap(Math.min(Math.max(Number(e.target.value) || 0, 0), 32))}
              className="w-14 text-center font-mono font-bold text-sm border border-gray-300 rounded-lg py-0.5 text-gray-900"
            />
          </div>

          {/* Toggle para ver modo esquema cssgridgenerator.io vs con fotos */}
          <label className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showPhotosInGrid}
              onChange={(e) => setShowPhotosInGrid(e.target.checked)}
              className="rounded text-black focus:ring-black"
            />
            <span>Mostrar fotos de fondo</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl">
              Guardando en tienda...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl">
              ✓ Guardado en tienda
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              const slot = findFirstAvailableSlot(activeItems, 1, 1, cols, rows);
              setPendingCellRect({ ...slot, colSpan: 1, rowSpan: 1 });
            }}
            className="px-4 py-2 rounded-xl bg-black hover:bg-gray-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            + Nueva Categoría
          </button>
        </div>
      </div>

      {/* Barra de categorías por colocar (cuando el usuario quita alguna con 'X' o da clic en Reset) */}
      {unplacedItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-amber-950">
            <span className="font-bold">
              Tienes {unplacedItems.length} categoría(s) listas para colocar:
            </span>{' '}
            Haz clic o arrastra sobre cualquier cuadro gris <kbd className="px-1.5 py-0.5 bg-[#b5b3ad] text-white rounded font-bold">+</kbd> del grid para colocar{' '}
            <strong className="underline">{unplacedItems[0].name}</strong>.
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unplacedItems.map((u, idx) => (
              <span
                key={u.id}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  idx === 0
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-amber-300'
                }`}
              >
                {idx === 0 ? `▶ Siguiente: ${u.name}` : u.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* LIENZO 2D IDÉNTICO A HTTPS://CSSGRIDGENERATOR.IO/                    */}
      {/* ==================================================================== */}
      <div className="bg-[#f7f4ee] p-6 sm:p-8 rounded-3xl border border-[#e2ddd3] shadow-inner space-y-4">
        <div
          ref={gridBoardRef}
          className="relative grid w-full min-w-[600px]"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, 68px)`,
            gap: `${gap}px`,
          }}
        >
          {/* ---------------------------------------------------------------- */}
          {/* CELDAS GRISES CON '+' (IGUAL QUE EN CSSGRIDGENERATOR.IO)         */}
          {/* ---------------------------------------------------------------- */}
          {Array.from({ length: rows }).map((_, rIdx) =>
            Array.from({ length: cols }).map((__, cIdx) => {
              const cellCol = cIdx + 1;
              const cellRow = rIdx + 1;

              const isCovered = activeItems.some(
                (cat) =>
                  cellCol >= cat.colStart &&
                  cellCol < cat.colStart + cat.colSpan &&
                  cellRow >= cat.rowStart &&
                  cellRow < cat.rowStart + cat.rowSpan
              );

              const isInsideDraw =
                activeDrawRect &&
                cellCol >= activeDrawRect.colStart &&
                cellCol < activeDrawRect.colStart + activeDrawRect.colSpan &&
                cellRow >= activeDrawRect.rowStart &&
                cellRow < activeDrawRect.rowStart + activeDrawRect.rowSpan;

              return (
                <div
                  key={`cell-${cellCol}-${cellRow}`}
                  style={{
                    gridColumn: `${cellCol} / span 1`,
                    gridRow: `${cellRow} / span 1`,
                  }}
                  onPointerDown={(e) => {
                    if (isCovered || e.button !== 0) return;
                    e.preventDefault();
                    setDrawState({
                      startCol: cellCol,
                      startRow: cellRow,
                      endCol: cellCol,
                      endRow: cellRow,
                    });
                  }}
                  className={`rounded-lg flex items-center justify-center transition-colors select-none ${
                    isCovered
                      ? 'opacity-0 pointer-events-none'
                      : isInsideDraw
                      ? 'bg-[#8c8a84] text-white cursor-crosshair shadow-inner'
                      : 'bg-[#b5b3ad] hover:bg-[#a3a19b] text-white cursor-pointer shadow-xs'
                  }`}
                >
                  <span className="text-lg font-normal leading-none">+</span>
                </div>
              );
            })
          )}

          {/* ---------------------------------------------------------------- */}
          {/* CAJAS COLOCADAS (1, 2, 3...) CON BOTÓN ROSA 'X' Y ESQUINA '⌟'    */}
          {/* ---------------------------------------------------------------- */}
          {activeItems.map((cat, idx) => {
            const isBeingDragged = dragState?.id === cat.id;
            const isBeingResized = resizeState?.id === cat.id;

            return (
              <div
                key={cat.id}
                style={{
                  gridColumn: `${cat.colStart} / span ${cat.colSpan}`,
                  gridRow: `${cat.rowStart} / span ${cat.rowSpan}`,
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-no-drag="true"]')) return;

                  e.preventDefault();
                  const { col, row } = getCellFromClientXY(e.clientX, e.clientY);
                  setDragState({
                    id: cat.id,
                    grabOffsetCol: Math.max(0, Math.min(col - cat.colStart, cat.colSpan - 1)),
                    grabOffsetRow: Math.max(0, Math.min(row - cat.rowStart, cat.rowSpan - 1)),
                  });
                }}
                className={`group relative z-20 rounded-lg overflow-hidden flex flex-col items-center justify-between p-3 cursor-grab active:cursor-grabbing transition-shadow ${
                  showPhotosInGrid && cat.imageUrl
                    ? 'bg-gray-900 text-white border-[1.5px] border-gray-900 shadow-md'
                    : 'bg-[#faf7f2] text-gray-900 border-[1.5px] border-gray-800 shadow-md'
                } ${
                  isBeingDragged || isBeingResized
                    ? 'ring-2 ring-pink-500 shadow-xl z-30'
                    : 'hover:shadow-lg'
                }`}
              >
                {/* Fondo opcional con foto de la categoría */}
                {showPhotosInGrid && cat.imageUrl && (
                  <>
                    <div
                      className="absolute inset-0 bg-cover bg-center pointer-events-none"
                      style={{ backgroundImage: `url('${cat.imageUrl}')` }}
                    />
                    <div className="absolute inset-0 bg-black/55 pointer-events-none" />
                  </>
                )}

                {/* BOTÓN ROSA 'X' EN LA ESQUINA SUPERIOR DERECHA (IDÉNTICO A CSSGRIDGENERATOR.IO) */}
                <button
                  type="button"
                  data-no-drag="true"
                  onClick={() => handleRemoveFromGrid(cat.id)}
                  title="Quitar bloque del grid (liberar celdas +)"
                  className="absolute top-0 right-0 z-30 w-5 h-5 bg-[#e84a8a] hover:bg-[#d13674] text-white text-[11px] font-normal leading-none flex items-center justify-center rounded-bl-sm transition-colors"
                >
                  x
                </button>

                {/* Número superior centrado (1, 2, 3...) igual que en cssgridgenerator.io */}
                <div className="relative z-10 text-center w-full pt-0.5">
                  <span className="text-sm font-medium tracking-tight">
                    {idx + 1}
                  </span>
                </div>

                {/* Contenido central: Selector / Nombre de Categoría y Acciones rápidas */}
                <div
                  data-no-drag="true"
                  className="relative z-10 flex flex-col items-center justify-center gap-1.5 my-auto px-2 max-w-full"
                >
                  <select
                    value={cat.id}
                    onChange={(e) => handleSwapCategoryInBox(cat.id, e.target.value)}
                    className={`text-xs font-bold rounded-lg px-2 py-1 border text-center max-w-full truncate cursor-pointer ${
                      showPhotosInGrid && cat.imageUrl
                        ? 'bg-black/75 text-white border-white/25'
                        : 'bg-white/90 text-gray-900 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {items.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-white text-gray-900">
                        {opt.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-mono opacity-75">
                      {cat.colSpan}×{cat.rowSpan}
                    </span>

                    {/* Subir imagen */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetUploadId(cat.id);
                        fileInputRef.current?.click();
                      }}
                      title="Cambiar foto de portada"
                      className="px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/20 text-[10px] font-semibold"
                    >
                      {isUploading === cat.id ? '...' : '📷 Foto'}
                    </button>

                    {/* Editar nombre / slug */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCat(cat);
                        setEditName(cat.name);
                        setEditSlug(cat.slug);
                        setEditImageUrl(cat.imageUrl || '');
                      }}
                      title="Editar nombre o URL"
                      className="px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/20 text-[10px] font-semibold"
                    >
                      ✎
                    </button>
                  </div>
                </div>

                {/* Espaciador inferior */}
                <div className="h-2" />

                {/* MANIJA DE ESQUINA INFERIOR DERECHA '⌟' (IDÉNTICA A CSSGRIDGENERATOR.IO) */}
                <div
                  data-no-drag="true"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setResizeState({
                      id: cat.id,
                      colStart: cat.colStart,
                      rowStart: cat.rowStart,
                    });
                  }}
                  title="Arrastra esta esquina para estirar columnas y filas en 2D"
                  className="absolute bottom-1.5 right-1.5 z-30 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-0.5 group/corner"
                >
                  <span
                    className={`w-2.5 h-2.5 border-r-[2.5px] border-b-[2.5px] transition-transform group-hover/corner:scale-125 ${
                      showPhotosInGrid && cat.imageUrl ? 'border-white' : 'border-gray-900'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón Reset inferior derecho (idéntico a cssgridgenerator.io) */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Arrastra la esquina <strong>⌟</strong> de cualquier bloque para estirarlo en 2D, o haz clic en <strong>x</strong> para liberar celdas <strong>+</strong>.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetGrid}
              className="px-4 py-1 rounded-md border border-gray-900 bg-white hover:bg-gray-100 text-gray-900 text-xs font-semibold shadow-2xs transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => persistLayout(items)}
              className="px-4 py-1 rounded-md border border-black bg-black hover:bg-gray-800 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              Guardar en Tienda
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* PANELES INFERIORES 'Copy HTML' Y 'Copy CSS' (COMO EN LA CAPTURA 3) */}
        {/* ================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Panel HTML */}
          <div className="relative pt-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(generatedHtml);
                setCopiedType('html');
                setTimeout(() => setCopiedType(null), 1500);
              }}
              className="absolute top-0 right-4 px-3.5 py-1 rounded-md bg-[#2b2b2b] hover:bg-black text-white text-xs font-bold shadow"
            >
              {copiedType === 'html' ? 'Copied!' : 'Copy HTML'}
            </button>
            <pre className="bg-white rounded-xl border border-[#e5e0d5] p-5 text-xs font-mono text-gray-800 overflow-x-auto shadow-xs min-h-[140px]">
              {generatedHtml}
            </pre>
          </div>

          {/* Panel CSS */}
          <div className="relative pt-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(generatedCss);
                setCopiedType('css');
                setTimeout(() => setCopiedType(null), 1500);
              }}
              className="absolute top-0 right-4 px-3.5 py-1 rounded-md bg-[#2b2b2b] hover:bg-black text-white text-xs font-bold shadow"
            >
              {copiedType === 'css' ? 'Copied!' : 'Copy CSS'}
            </button>
            <pre className="bg-white rounded-xl border border-[#e5e0d5] p-5 text-xs font-mono text-gray-800 overflow-x-auto shadow-xs min-h-[140px]">
              {generatedCss}
            </pre>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL PARA CREAR NUEVA CATEGORÍA EN LA CELDA '+' SELECCIONADA        */}
      {/* ==================================================================== */}
      {pendingCellRect && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-indigo-600">
                  Columna {pendingCellRect.colStart}, Fila {pendingCellRect.rowStart} ({pendingCellRect.colSpan}×{pendingCellRect.rowSpan})
                </span>
                <h3 className="text-base font-extrabold text-gray-900">
                  Nueva Categoría en este Bloque
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingCellRect(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Nombre</label>
              <input
                type="text"
                required
                autoFocus
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNewSlug(
                    e.target.value
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')
                  );
                }}
                placeholder="Ej. Ediciones Especiales"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Slug (URL)</label>
              <input
                type="text"
                required
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Imagen de Portada</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://... o sube una foto"
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono"
                />
                <label className="cursor-pointer px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700">
                  {isUploading === 'new' ? '...' : 'Subir'}
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

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPendingCellRect(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingNew}
                className="px-5 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800"
              >
                {isSavingNew ? 'Creando...' : 'Crear Bloque'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL PARA EDITAR NOMBRE / SLUG / FOTO O ELIMINAR CATEGORÍA          */}
      {/* ==================================================================== */}
      {editingCat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-gray-900">
                Editar Categoría
              </h3>
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Nombre</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700">Slug (URL)</label>
              <input
                type="text"
                required
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Imagen de Portada</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono"
                />
                <label className="cursor-pointer px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700">
                  {isUploading === 'edit-modal' ? '...' : 'Subir'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageFile(e.target.files[0], 'edit-modal');
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const id = editingCat.id;
                  setEditingCat(null);
                  handleDeletePermanent(id);
                }}
                className="text-xs font-bold text-red-600 hover:text-red-800"
              >
                Eliminar de la tienda
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800"
                >
                  Guardar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
