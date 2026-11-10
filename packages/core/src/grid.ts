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
