/**
 * Sistema universal de dimensionamiento de Grids para Categorías y Productos.
 * Permite cualquier proporción: 1x1, 2x1, 3x1, 4x1, 1x2, 2x2, 3x2, 4x2, 1x3, 2x3, 3x3, 4x3.
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

export function normalizeSpan(span: string | null | undefined): string {
  if (!span) return '1x1';
  if (span === 'col-1') return '1x1';
  if (span === 'col-2') return '2x1';
  if (span === 'col-3') return '3x1';
  if (span === 'col-4' || span === 'full') return '4x1';
  if (span === 'tall') return '1x2';
  if (span === 'large') return '2x2';
  return span;
}

/**
 * Traduce cualquier dimensión (por ej. '2x1', '2x2', '3x2', 'col-2', 'large')
 * a clases responsivas de Tailwind CSS.
 * 
 * Contiene cadenas literales completas para que el escáner de Tailwind JIT
 * las detecte y genere siempre el CSS correspondiente sin depender de runtime dynamic interpolation.
 */
export function getGridSpanClasses(span: string | null | undefined): string {
  const norm = normalizeSpan(span);

  switch (norm) {
    case '1x1':
      return 'col-span-1 row-span-1 min-h-[220px]';
    case '2x1':
      return 'col-span-1 sm:col-span-2 md:col-span-2 row-span-1 min-h-[220px]';
    case '3x1':
      return 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3 row-span-1 min-h-[220px]';
    case '4x1':
      return 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 row-span-1 min-h-[240px]';
    case '1x2':
      return 'col-span-1 row-span-2 min-h-[460px]';
    case '2x2':
      return 'col-span-1 sm:col-span-2 md:col-span-2 row-span-2 min-h-[460px]';
    case '3x2':
      return 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3 row-span-2 min-h-[460px]';
    case '4x2':
      return 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 row-span-2 min-h-[480px]';
    case '1x3':
      return 'col-span-1 row-span-3 min-h-[700px]';
    case '2x3':
      return 'col-span-1 sm:col-span-2 md:col-span-2 row-span-3 min-h-[700px]';
    case '3x3':
      return 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3 row-span-3 min-h-[700px]';
    case '4x3':
      return 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 row-span-3 min-h-[720px]';
    default: {
      // Parser dinámico para casos no estándar
      const match = norm.match(/(\d+)x(\d+)/i);
      if (match) {
        const c = Math.min(Math.max(parseInt(match[1], 10), 1), 4);
        const r = Math.min(Math.max(parseInt(match[2], 10), 1), 4);
        const colClass = c === 1 ? 'col-span-1' : c === 2 ? 'col-span-1 sm:col-span-2 md:col-span-2' : c === 3 ? 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3' : 'col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4';
        const rowClass = r === 1 ? 'row-span-1 min-h-[220px]' : r === 2 ? 'row-span-2 min-h-[460px]' : r === 3 ? 'row-span-3 min-h-[700px]' : 'row-span-4 min-h-[940px]';
        return `${colClass} ${rowClass}`;
      }
      return 'col-span-1 row-span-1 min-h-[220px]';
    }
  }
}
