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
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;`,
        `CREATE TABLE IF NOT EXISTS site_settings (
          id TEXT PRIMARY KEY,
          site_name TEXT NOT NULL DEFAULT 'LUNA ART STUDIO',
          logo_svg TEXT,
          logo_color TEXT NOT NULL DEFAULT '#ec4899',
          hero_title TEXT NOT NULL DEFAULT 'Ilustración de Autor, Prints & Merch Exclusivo',
          hero_subtitle TEXT NOT NULL DEFAULT 'Láminas de arte fine art, stickers holográficos, pines esmaltados y papelería ilustrada para alegrar tu día a día.',
          hero_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&auto=format&fit=crop&q=80',
          hero_cta_text TEXT NOT NULL DEFAULT 'Explorar Tienda de Arte',
          hero_cta_link TEXT NOT NULL DEFAULT '/catalogo',
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`,
        `INSERT INTO site_settings (id, site_name, logo_color, hero_title, hero_subtitle, hero_image_url, hero_cta_text, hero_cta_link)
         VALUES (
           'default',
           'LUNA ART STUDIO',
           '#ec4899',
           'Ilustración de Autor, Prints & Merch Exclusivo',
           'Láminas de arte fine art, stickers holográficos, pines esmaltados y papelería ilustrada para alegrar tu día a día.',
           'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&auto=format&fit=crop&q=80',
           'Explorar Tienda de Arte',
           '/catalogo'
         ) ON CONFLICT (id) DO NOTHING;`,
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
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_street TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_ext_number TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_int_number TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_neighborhood TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_municipality TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zip TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_references TEXT;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_lat DOUBLE PRECISION;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_lng DOUBLE PRECISION;`,
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_source TEXT;`,
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

