import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './grid';

let connectionString =
  process.env.DATABASE_URL ||
  'postgres://admin:admin123@127.0.0.1:5432/esqueleto';

// Si estamos dentro del contenedor Docker o la URL ya apunta a postgres
const isInsideDocker = Boolean(
  typeof process !== 'undefined' &&
  (process.env.DOCKER_CONTAINER || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@postgres:')))
);

if (isInsideDocker) {
  connectionString = connectionString
    .replace('@localhost:', '@postgres:')
    .replace('@127.0.0.1:', '@postgres:');
} else {
  // En máquina local fuera de Docker, conectar siempre a 127.0.0.1:5432 para evitar fallos con IPv6 (::1) en Windows
  connectionString = connectionString
    .replace('@postgres:', '@127.0.0.1:')
    .replace('@localhost:', '@127.0.0.1:');
}

export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 1,
});

export const db = drizzle(client, { schema });

let dbAlive: boolean | null = null;
let lastDbCheck = 0;
const DB_CHECK_INTERVAL = 10000;

export async function isDatabaseAvailable(): Promise<boolean> {
  const now = Date.now();
  if (dbAlive !== null && (now - lastDbCheck < DB_CHECK_INTERVAL)) {
    return dbAlive;
  }

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('CONNECT_TIMEOUT')), 350)
    );
    await Promise.race([client`SELECT 1`.simple(), timeout]);
    dbAlive = true;
    lastDbCheck = now;
    return true;
  } catch {
    dbAlive = false;
    lastDbCheck = now;
    return false;
  }
}

// Migración y auto-verificación en tiempo de ejecución
let schemaEnsured = false;
let schemaPromise: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (schemaEnsured) return;
  const available = await isDatabaseAvailable();
  if (!available) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    try {
      const statements = [
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'customer',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          image_url TEXT,
          grid_span TEXT NOT NULL DEFAULT '1x1',
          display_order INTEGER NOT NULL DEFAULT 0
        );`,
        `CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          base_price INTEGER NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          is_featured BOOLEAN NOT NULL DEFAULT false,
          category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS product_modifiers (
          id TEXT PRIMARY KEY,
          product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'single',
          required BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS modifier_options (
          id TEXT PRIMARY KEY,
          modifier_id TEXT NOT NULL REFERENCES product_modifiers(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          price_delta INTEGER NOT NULL DEFAULT 0,
          is_default BOOLEAN NOT NULL DEFAULT false
        );`,
        `ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;`,
        `ALTER TABLE categories ADD COLUMN IF NOT EXISTS grid_span TEXT NOT NULL DEFAULT '1x1';`,
        `ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;`,
        `CREATE TABLE IF NOT EXISTS site_settings (
          id TEXT PRIMARY KEY,
          site_name TEXT NOT NULL DEFAULT 'ESQUELETO',
          logo_svg TEXT,
          logo_color TEXT NOT NULL DEFAULT '#4f46e5',
          hero_title TEXT NOT NULL DEFAULT 'Velocidad extrema. Control total en Docker.',
          hero_subtitle TEXT NOT NULL DEFAULT 'E-commerce Open Source Plug & Play de alto rendimiento con catálogo interactivo y checkout seguro.',
          hero_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
          hero_cta_text TEXT NOT NULL DEFAULT 'Explorar Catálogo',
          hero_cta_link TEXT NOT NULL DEFAULT '/catalogo',
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`,
        `INSERT INTO site_settings (id, site_name, logo_color, hero_title, hero_subtitle, hero_image_url)
         VALUES (
           'default',
           'ESQUELETO',
           '#4f46e5',
           'Velocidad extrema. Control total en Docker.',
           'E-commerce Open Source Plug & Play de alto rendimiento con catálogo interactivo y checkout seguro.',
           'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80'
         ) ON CONFLICT (id) DO NOTHING;`,
        `UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=900&auto=format&fit=crop&q=80', grid_span = 'col-2', display_order = 1 WHERE slug = 'ropa' AND (image_url IS NULL OR image_url = '');`,
        `UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&auto=format&fit=crop&q=80', grid_span = 'col-1', display_order = 2 WHERE slug = 'tecnologia' AND (image_url IS NULL OR image_url = '');`,
        `UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&auto=format&fit=crop&q=80', grid_span = 'col-1', display_order = 3 WHERE slug = 'gourmet' AND (image_url IS NULL OR image_url = '');`,
        `UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&auto=format&fit=crop&q=80', grid_span = 'col-2', display_order = 4 WHERE slug = 'accesorios' AND (image_url IS NULL OR image_url = '');`,
        `CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          subtotal INTEGER,
          discount_code TEXT,
          discount_amount INTEGER NOT NULL DEFAULT 0,
          total INTEGER NOT NULL,
          customer_email TEXT,
          items_summary TEXT,
          items_json TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INTEGER;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0;`,
        `CREATE TABLE IF NOT EXISTS discount_codes (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          description TEXT,
          discount_type TEXT NOT NULL DEFAULT 'percentage',
          discount_value INTEGER NOT NULL,
          min_purchase INTEGER NOT NULL DEFAULT 0,
          max_discount INTEGER,
          usage_limit INTEGER,
          used_count INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          expires_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`,
        `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`,
        `CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);`,
        `CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);`,
        `CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`,
        `UPDATE products SET is_featured = true WHERE id IN ('prod-playera-01', 'prod-audifonos-02', 'prod-smartwatch-03', 'prod-cafe-04');`,
      ];

      for (const stmt of statements) {
        try {
          await client.unsafe(stmt);
        } catch (stmtErr: any) {
          if (stmtErr?.code === 'CONNECT_TIMEOUT' || stmtErr?.code === 'ECONNREFUSED' || stmtErr?.errno === 'CONNECT_TIMEOUT') {
            console.warn('No se pudo conectar a PostgreSQL (¿Docker/PostgreSQL está iniciado?). Saltando auto-migración.');
            break;
          }
          console.warn('Aviso en paso de migración:', stmtErr);
        }
      }
      schemaEnsured = true;
    } catch (err) {
      console.error('Error asegurando esquema en PostgreSQL:', err);
    } finally {
      schemaPromise = null;
    }
  })();

  return schemaPromise;
}

// Auto-ejecución inmediata no bloqueante
ensureSchema().catch(() => {});

export * from './schema';
export { eq, ne, gt, gte, lt, lte, and, or, not, sql, desc, asc, inArray, isNull, isNotNull } from 'drizzle-orm';

/**
 * Genera clases responsivas de Tailwind CSS para cualquier tamaño de Bento Grid
 * Soporta formatos: 'col-1', 'col-2', 'tall', 'large', 'full' y cualquier dimensión tipo '3x1', '2x2', '4x2', etc.
 */
export function getGridSpanClasses(span: string): string {
  if (!span) return 'col-span-1 row-span-1 min-h-[220px]';

  // Formatos históricos
  if (span === 'col-1' || span === '1x1') return 'col-span-1 row-span-1 min-h-[220px]';
  if (span === 'col-2' || span === '2x1') return 'col-span-1 md:col-span-2 row-span-1 min-h-[220px]';
  if (span === 'col-3' || span === '3x1') return 'col-span-1 md:col-span-3 row-span-1 min-h-[220px]';
  if (span === 'col-4' || span === '4x1' || span === 'full') return 'col-span-1 md:col-span-3 lg:col-span-4 row-span-1 min-h-[240px]';
  if (span === 'tall' || span === '1x2') return 'col-span-1 row-span-2 min-h-[460px]';
  if (span === 'large' || span === '2x2') return 'col-span-1 md:col-span-2 row-span-2 min-h-[460px]';
  if (span === '3x2') return 'col-span-1 md:col-span-3 row-span-2 min-h-[460px]';
  if (span === '4x2') return 'col-span-1 md:col-span-3 lg:col-span-4 row-span-2 min-h-[480px]';
  if (span === '1x3') return 'col-span-1 row-span-3 min-h-[700px]';
  if (span === '2x3') return 'col-span-1 md:col-span-2 row-span-3 min-h-[700px]';
  if (span === '3x3') return 'col-span-1 md:col-span-3 row-span-3 min-h-[700px]';
  if (span === '4x3') return 'col-span-1 md:col-span-3 lg:col-span-4 row-span-3 min-h-[720px]';

  // Parser dinámico para cualquier tamaño personalizado {columnas}x{filas}
  const match = span.match(/(\d+)x(\d+)/i) || span.match(/cols?-?(\d+)[^\d]+rows?-?(\d+)/i);
  if (match) {
    const cols = Math.min(Math.max(parseInt(match[1], 10), 1), 4);
    const rows = Math.min(Math.max(parseInt(match[2], 10), 1), 3);

    let colClass = 'col-span-1';
    if (cols === 2) colClass = 'col-span-1 md:col-span-2';
    else if (cols === 3) colClass = 'col-span-1 md:col-span-3';
    else if (cols >= 4) colClass = 'col-span-1 md:col-span-3 lg:col-span-4';

    let rowClass = 'row-span-1 min-h-[220px]';
    if (rows === 2) rowClass = 'row-span-2 min-h-[460px]';
    else if (rows >= 3) rowClass = 'row-span-3 min-h-[700px]';

    return `${colClass} ${rowClass}`;
  }

  return 'col-span-1 row-span-1 min-h-[220px]';
}

