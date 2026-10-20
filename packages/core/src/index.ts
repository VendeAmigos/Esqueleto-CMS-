import fs from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let connectionString =
  process.env.DATABASE_URL ||
  'postgres://admin:admin123@postgres:5432/esqueleto';

// Si estamos dentro del contenedor Docker (archivo .dockerenv o variables de host)
const isInsideDocker =
  fs.existsSync('/.dockerenv') ||
  process.env.HOST === '0.0.0.0' ||
  process.env.HOSTNAME === '0.0.0.0';

if (isInsideDocker) {
  connectionString = connectionString
    .replace('@localhost:', '@postgres:')
    .replace('@127.0.0.1:', '@postgres:');
}

export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 5,
});

export const db = drizzle(client, { schema });

// Migración y auto-verificación en tiempo de ejecución
let schemaEnsured = false;
let schemaPromise: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (schemaEnsured) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    try {
      const statements = [
        `ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;`,
        `ALTER TABLE categories ADD COLUMN IF NOT EXISTS grid_span TEXT NOT NULL DEFAULT 'col-1';`,
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
          total INTEGER NOT NULL,
          customer_email TEXT,
          items_summary TEXT,
          items_json TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );`,
        `UPDATE products SET is_featured = true WHERE id IN ('prod-playera-01', 'prod-audifonos-02', 'prod-smartwatch-03', 'prod-cafe-04');`,
      ];

      for (const stmt of statements) {
        try {
          await client.unsafe(stmt);
        } catch (stmtErr) {
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
export * from 'drizzle-orm';

