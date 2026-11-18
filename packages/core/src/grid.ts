/**
 * Sistema universal de dimensionamiento y posicionamiento 2D de Grids (estilo cssgridgenerator.io)
 * para Categorías y Productos.
 *
 * Soporta tanto formatos de solo tamaño ('1x1', '2x1', '2x2', etc.) como coordenadas explícitas
 * en el lienzo 2D ('2x5@2,1|5x8' => colSpan=2, rowSpan=5, colStart=2, rowStart=1 en un grid de 5x8).
 * Totalmente seguro para el cliente (sin dependencias de Node.js / fs).
 */

export const GRID_PRESETS = [
  { id: '1x1', label: '1x1 Cuadrado', cols: 1, rows: 1 },
  { id: '2x1', label: '2x1 Panorámico', cols: 2, rows: 1 },
  { id: '3x1', label: '3x1 Ancho (3 cols)', cols: 3, rows: 1 },
  { id: '4x1', label: '4x1 Fila Completa', cols: 4, rows: 1 },
  { id: '1x2', label: '1x2 Vertical', cols: 1, rows: 2 },
  { id: '2x2', label: '2x2 Cuadrado Grande', cols: 2, rows: 2 },
  { id: '3x2', label: '3x2 Gran Bloque', cols: 3, rows: 2 },
  { id: '4x2', label: '4x2 Banner Gigante', cols: 4, rows: 2 },
  { id: '1x3', label: '1x3 Torre Vertical', cols: 1, rows: 3 },
  { id: '2x3', label: '2x3 Torre Ancha', cols: 2, rows: 3 },
  { id: '3x3', label: '3x3 Mural 3x3', cols: 3, rows: 3 },
  { id: '4x3', label: '4x3 Mural Completo', cols: 4, rows: 3 },
] as const;

export interface ParsedGridSpan {
  colSpan: number;
  rowSpan: number;
  colStart: number | null;
  rowStart: number | null;
  boardCols: number | null;
  boardRows: number | null;
  sizeId: string;
}

/**
 * Parsea una cadena de gridSpan como '2x5@2,1|5x8', '2x2@1,1', '2x1', 'col-2', 'large', 'tall'.
 */
export function parseGridSpan(span: string | null | undefined): ParsedGridSpan {
  if (!span) {
    return {
      colSpan: 1,
      rowSpan: 1,
      colStart: null,
      rowStart: null,
      boardCols: null,
      boardRows: null,
      sizeId: '1x1',
    };
  }

  const trimmed = span.trim();
  const [mainPart, boardPart] = trimmed.split('|');
  const [rawSize, rawPos] = (mainPart || '').split('@');

  let sizePart = rawSize || '1x1';
  if (sizePart === 'col-1') sizePart = '1x1';
  else if (sizePart === 'col-2') sizePart = '2x1';
  else if (sizePart === 'col-3') sizePart = '3x1';
  else if (sizePart === 'col-4' || sizePart === 'full') sizePart = '4x1';
  else if (sizePart === 'tall') sizePart = '1x2';
  else if (sizePart === 'large') sizePart = '2x2';

  const sizeMatch = sizePart.match(/(\d+)x(\d+)/i);
  const colSpan = sizeMatch ? Math.min(Math.max(parseInt(sizeMatch[1], 10), 1), 12) : 1;
  const rowSpan = sizeMatch ? Math.min(Math.max(parseInt(sizeMatch[2], 10), 1), 12) : 1;

  let colStart: number | null = null;
  let rowStart: number | null = null;

  if (rawPos) {
    const posMatch = rawPos.match(/(\d+)[,:](\d+)/);
    if (posMatch) {
      colStart = Math.min(Math.max(parseInt(posMatch[1], 10), 1), 12);
      rowStart = Math.min(Math.max(parseInt(posMatch[2], 10), 1), 12);
    }
  }

  let boardCols: number | null = null;
  let boardRows: number | null = null;
  if (boardPart) {
    const bMatch = boardPart.match(/(\d+)x(\d+)/i);
    if (bMatch) {
      boardCols = Math.min(Math.max(parseInt(bMatch[1], 10), 1), 12);
      boardRows = Math.min(Math.max(parseInt(bMatch[2], 10), 1), 12);
    }
  }

  return {
    colSpan,
    rowSpan,
    colStart,
    rowStart,
    boardCols,
    boardRows,
    sizeId: `${colSpan}x${rowSpan}`,
  };
}

/**
 * Formatea dimensiones, coordenadas y tamaño de tablero opcional en el string persistido en DB
 * (ej. '2x5@2,1|5x8').
 */
export function formatGridSpan(
  colSpan: number,
  rowSpan: number,
  colStart?: number | null,
  rowStart?: number | null,
  boardCols?: number | null,
  boardRows?: number | null
): string {
  const cSpan = Math.min(Math.max(Math.round(colSpan), 1), 12);
  const rSpan = Math.min(Math.max(Math.round(rowSpan), 1), 12);
  let base = `${cSpan}x${rSpan}`;
  if (colStart && rowStart && colStart >= 1 && rowStart >= 1) {
    base += `@${Math.round(colStart)},${Math.round(rowStart)}`;
  }
  if (boardCols && boardRows && boardCols >= 1 && boardRows >= 1) {
    base += `|${Math.round(boardCols)}x${Math.round(boardRows)}`;
  }
  return base;
}

/**
 * Devuelve únicamente la proporción normalizada ('1x1', '2x2', etc.) sin las coordenadas.
 */
export function normalizeSpan(span: string | null | undefined): string {
  return parseGridSpan(span).sizeId;
}

export function getGridSpanClasses(span: string | null | undefined): string {
  const parsed = parseGridSpan(span);
  const c = Math.min(Math.max(parsed.colSpan, 1), 4);
  const colClass =
    c === 1
      ? 'col-span-1'
      : c === 2
      ? 'col-span-1 sm:col-span-2'
      : c === 3
      ? 'col-span-1 sm:col-span-2 md:col-span-3'
      : 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4';

  return `${colClass} min-h-[220px]`;
}

// ============================================================================
// Presets, Algoritmo de Acomodo Automático y Stagger tipo Pinterest (Galería)
// ============================================================================

export type GalleryColumnCount = 3 | 4 | 5;

export const GALLERY_PRESETS = [
  { id: '1x1', label: 'Cuadrada (1x1)', short: 'Cuadrada', cols: 1, rows: 1 },
  { id: '2x1', label: 'Horizontal (2x1)', short: 'Horizontal', cols: 2, rows: 1 },
  { id: '1x2', label: 'Vertical (1x2)', short: 'Vertical', cols: 1, rows: 2 },
  { id: '2x2', label: 'Destacada (2x2)', short: 'Destacada', cols: 2, rows: 2 },
  { id: '3x1', label: 'Panorámica (3x1)', short: 'Panorámica', cols: 3, rows: 1 },
  { id: '1x3', label: 'Torre (1x3)', short: 'Torre', cols: 1, rows: 3 },
  { id: '2x3', label: 'Editorial (2x3)', short: 'Editorial', cols: 2, rows: 3 },
  { id: '3x2', label: 'Mural (3x2)', short: 'Mural', cols: 3, rows: 2 },
] as const;

export function normalizeGalleryColumns(cols: number | null | undefined): GalleryColumnCount {
  if (cols === 3 || cols === 5) return cols;
  return 4;
}

export function suggestGallerySpanForImage(
  width: number | null | undefined,
  height: number | null | undefined,
  totalCols: number = 4,
  promoteHero: boolean = false
): { colSpan: number; rowSpan: number; presetId: string } {
  const safeW = width && width > 0 ? width : 800;
  const safeH = height && height > 0 ? height : 800;
  const ratio = safeW / safeH;
  const cols = normalizeGalleryColumns(totalCols);

  if (promoteHero && cols >= 4 && ratio >= 0.78 && ratio <= 1.45) {
    return { colSpan: 2, rowSpan: 2, presetId: '2x2' };
  }
  if (ratio >= 1.85 && cols >= 4) {
    return { colSpan: 3, rowSpan: 1, presetId: '3x1' };
  }
  if (ratio >= 1.24) {
    return { colSpan: 2, rowSpan: 1, presetId: '2x1' };
  }
  if (ratio <= 0.62) {
    return { colSpan: 1, rowSpan: 3, presetId: '1x3' };
  }
  if (ratio <= 0.84) {
    return { colSpan: 1, rowSpan: 2, presetId: '1x2' };
  }
  return { colSpan: 1, rowSpan: 1, presetId: '1x1' };
}

export interface AutoArrangeGalleryInput {
  id: string;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
  displayOrder?: number | null;
}

export interface AutoArrangedGallerySlot {
  id: string;
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
  gridSpan: string;
  displayOrder: number;
}

interface GridBox {
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
}

function boxesOverlap(a: GridBox, b: GridBox): boolean {
  return !(
    a.colStart + a.colSpan - 1 < b.colStart ||
    a.colStart > b.colStart + b.colSpan - 1 ||
    a.rowStart + a.rowSpan - 1 < b.rowStart ||
    a.rowStart > b.rowStart + b.rowSpan - 1
  );
}

/**
 * Calcula un acomodo asimétrico óptimo en 2D analizando la proporción real (ancho/alto)
 * de cada imagen para decidir si conviene Cuadrada (1x1), Horizontal (2x1 / 3x1),
 * Vertical (1x2 / 1x3) o Destacada (2x2), empaquetando por filas sin huecos.
 */
export function autoArrangeGalleryGrid<T extends AutoArrangeGalleryInput>(
  items: T[],
  rawCols: number = 4
): AutoArrangedGallerySlot[] {
  if (items.length === 0) return [];

  const totalCols = normalizeGalleryColumns(rawCols);

  // Elegir hasta 1-2 fotos protagonistas (mayor resolución y proporción equilibrada)
  const heroBudget = totalCols >= 4 && items.length >= 6 ? 2 : items.length >= 4 ? 1 : 0;
  const heroIds = new Set(
    [...items]
      .filter((item) => {
        const w = item.width || 800;
        const h = item.height || 800;
        const r = w / Math.max(h, 1);
        return r >= 0.78 && r <= 1.48;
      })
      .sort((a, b) => {
        const areaA = (a.width || 800) * (a.height || 800);
        const areaB = (b.width || 800) * (b.height || 800);
        return areaB - areaA;
      })
      .slice(0, heroBudget)
      .map((item) => item.id)
  );

  interface PendingPiece {
    id: string;
    colSpan: number;
    rowSpan: number;
    ratio: number;
    order: number;
  }

  const pending: PendingPiece[] = items.map((item, idx) => {
    const w = item.width && item.width > 0 ? item.width : 800;
    const h = item.height && item.height > 0 ? item.height : 800;
    const suggested = suggestGallerySpanForImage(w, h, totalCols, heroIds.has(item.id));
    return {
      id: item.id,
      colSpan: Math.min(Math.max(suggested.colSpan, 1), totalCols),
      rowSpan: suggested.rowSpan,
      ratio: w / h,
      order: item.displayOrder ?? idx + 1,
    };
  });

  // Alternar ligeramente para evitar que todas las piezas anchas queden juntas
  const pool = [...pending];
  const placed: Array<PendingPiece & GridBox> = [];

  const isAreaFree = (candidate: GridBox): boolean => {
    if (candidate.colStart < 1 || candidate.colStart + candidate.colSpan - 1 > totalCols) {
      return false;
    }
    return !placed.some((p) => boxesOverlap(candidate, p));
  };

  let row = 1;
  const maxIterations = items.length * 10 + 40;
  let guard = 0;

  while (pool.length > 0 && guard < maxIterations) {
    guard++;
    for (let col = 1; col <= totalCols && pool.length > 0; col++) {
      // Si la celda (col, row) ya está ocupada por un bloque superior (ej. vertical 1x2), avanzar
      if (!isAreaFree({ colStart: col, rowStart: row, colSpan: 1, rowSpan: 1 })) {
        continue;
      }

      // Medir cuántas columnas contiguas están libres desde `col` en esta fila
      let contiguousFree = 0;
      for (let c = col; c <= totalCols; c++) {
        if (isAreaFree({ colStart: c, rowStart: row, colSpan: 1, rowSpan: 1 })) {
          contiguousFree++;
        } else {
          break;
        }
      }

      // Buscar primero en los siguientes elementos uno que quepa exactamente sin dejar hueco huérfano
      let chosenIdx = pool.findIndex(
        (piece) =>
          piece.colSpan <= contiguousFree &&
          isAreaFree({
            colStart: col,
            rowStart: row,
            colSpan: piece.colSpan,
            rowSpan: piece.rowSpan,
          })
      );

      // Si tenemos espacio justo de 1 columna y la pieza encontrada es de 1x*, usarla para rellenar el hueco
      if (chosenIdx === -1 && contiguousFree === 1) {
        chosenIdx = pool.findIndex((piece) => piece.colSpan === 1);
      }

      if (chosenIdx !== -1) {
        const [piece] = pool.splice(chosenIdx, 1);
        placed.push({
          ...piece,
          colStart: col,
          rowStart: row,
        });
      } else if (pool.length > 0 && contiguousFree < totalCols) {
        // Si queda un bloque de ancho mayor al espacio restante en esta fila y no hay piezas estrechas:
        // verificar si el bloque de la izquierda puede absorber +1 columna sin deformarse
        const leftNeighbor = placed.find(
          (p) =>
            p.rowStart === row &&
            p.colStart + p.colSpan === col &&
            p.rowSpan === 1 &&
            p.ratio >= 0.92 &&
            p.colSpan + contiguousFree <= Math.min(3, totalCols)
        );
        if (leftNeighbor) {
          const expanded: GridBox = {
            colStart: leftNeighbor.colStart,
            rowStart: leftNeighbor.rowStart,
            colSpan: leftNeighbor.colSpan + 1,
            rowSpan: leftNeighbor.rowSpan,
          };
          const otherBoxes = placed.filter((p) => p.id !== leftNeighbor.id);
          if (!otherBoxes.some((b) => boxesOverlap(expanded, b))) {
            leftNeighbor.colSpan += 1;
          }
        }
      }
    }
    row++;
  }

  // Fallback de seguridad si quedó alguno pendiente
  for (const leftover of pool) {
    let placedLeftover = false;
    for (let r = row; r <= row + 30 && !placedLeftover; r++) {
      for (let c = 1; c <= totalCols - leftover.colSpan + 1; c++) {
        const candidate: GridBox = {
          colStart: c,
          rowStart: r,
          colSpan: leftover.colSpan,
          rowSpan: leftover.rowSpan,
        };
        if (isAreaFree(candidate)) {
          placed.push({ ...leftover, ...candidate });
          placedLeftover = true;
          break;
        }
      }
    }
  }

  const totalRows = Math.max(
    2,
    placed.reduce((acc, p) => Math.max(acc, p.rowStart + p.rowSpan - 1), 1)
  );

  const sorted = [...placed].sort((a, b) =>
    a.rowStart !== b.rowStart ? a.rowStart - b.rowStart : a.colStart - b.colStart
  );

  return sorted.map((item, idx) => ({
    id: item.id,
    colStart: item.colStart,
    rowStart: item.rowStart,
    colSpan: item.colSpan,
    rowSpan: item.rowSpan,
    gridSpan: formatGridSpan(
      item.colSpan,
      item.rowSpan,
      item.colStart,
      item.rowStart,
      totalCols,
      totalRows
    ),
    displayOrder: idx + 1,
  }));
}

export interface StaggeredPinterestItemInput {
  id: string;
  gridSpan: string;
  displayOrder?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface StaggeredPinterestPlacement {
  id: string;
  colStart: number;
  colSpan: number;
  subRowStart: number;
  subRowSpan: number;
  aspectStyle: string;
}

/**
 * Calcula posiciones escalonadas ("desfasadas tipo Pinterest") en sub-filas (1 fila = 2 sub-filas)
 * respetando columnas (3, 4 o 5 en desktop; 2 en móvil) con 0 superposición.
 */
export function computePinterestStaggerPositions<T extends StaggeredPinterestItemInput>(
  items: T[],
  cols: number = 4
): Map<string, StaggeredPinterestPlacement> {
  const result = new Map<string, StaggeredPinterestPlacement>();
  if (items.length === 0) return result;

  const safeCols = Math.min(Math.max(Math.round(cols), 2), 5);
  // Desfase inicial alternado: columnas pares arrancan 1 sub-fila (~medio card) más abajo
  const colBottom: number[] = Array.from({ length: safeCols }, (_, idx) => (idx % 2 === 1 ? 1 : 0));

  const parsedItems = items
    .map((item, idx) => {
      const parsed = parseGridSpan(item.gridSpan);
      return {
        item,
        parsed,
        sortOrder: item.displayOrder ?? idx + 1,
        index: idx,
      };
    })
    .sort((a, b) => {
      const rA = a.parsed.rowStart ?? 999;
      const rB = b.parsed.rowStart ?? 999;
      if (rA !== rB) return rA - rB;
      const cA = a.parsed.colStart ?? 999;
      const cB = b.parsed.colStart ?? 999;
      if (cA !== cB) return cA - cB;
      return a.sortOrder - b.sortOrder;
    });

  for (const { item, parsed } of parsedItems) {
    const rawColSpan = safeCols === 2 ? (parsed.colSpan >= 2 && parsed.rowSpan >= 2 ? 2 : 1) : parsed.colSpan;
    const colSpan = Math.min(Math.max(rawColSpan, 1), safeCols);

    // Determinar sub-filas de altura según la proporción seleccionada
    const w = item.width && item.width > 0 ? item.width : 800;
    const h = item.height && item.height > 0 ? item.height : 800;
    const baseSubRows = Math.min(Math.max(parsed.rowSpan, 1), 4) * 2;
    const subRowSpan =
      parsed.rowSpan === 1 && parsed.colSpan === 1 && w / h < 0.88
        ? 3
        : baseSubRows;

    let colStart = 1;
    if (safeCols > 2 && parsed.colStart !== null) {
      colStart = Math.min(Math.max(parsed.colStart, 1), safeCols - colSpan + 1);
    } else {
      // Elegir la columna donde termina más arriba para equilibrar el flujo tipo Pinterest
      let bestCol = 1;
      let bestBottom = Infinity;
      for (let c = 1; c <= safeCols - colSpan + 1; c++) {
        const spanBottom = Math.max(...colBottom.slice(c - 1, c - 1 + colSpan));
        if (spanBottom < bestBottom) {
          bestBottom = spanBottom;
          bestCol = c;
        }
      }
      colStart = bestCol;
    }

    const startBottom = Math.max(...colBottom.slice(colStart - 1, colStart - 1 + colSpan));
    const subRowStart = startBottom + 1;
    const newBottom = startBottom + subRowSpan;

    for (let c = colStart - 1; c < colStart - 1 + colSpan; c++) {
      colBottom[c] = newBottom;
    }

    result.set(item.id, {
      id: item.id,
      colStart,
      colSpan,
      subRowStart,
      subRowSpan,
      aspectStyle: `${colSpan} / ${parsed.rowSpan}`,
    });
  }

  return result;
}
