import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://admin:admin123@localhost:5432/esqueleto';

export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// Migración y auto-verificación en tiempo de ejecución
export async function ensureSchema() {
  try {
    await client`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS grid_span TEXT NOT NULL DEFAULT 'col-1';
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
      CREATE TABLE IF NOT EXISTS site_settings (
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
      );
      INSERT INTO site_settings (id, site_name, logo_color, hero_title, hero_subtitle, hero_image_url)
      VALUES (
        'default',
        'ESQUELETO',
        '#4f46e5',
        'Velocidad extrema. Control total en Docker.',
        'E-commerce Open Source Plug & Play de alto rendimiento con catálogo interactivo y checkout seguro.',
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80'
      ) ON CONFLICT (id) DO NOTHING;
    `;
  } catch (err) {
    console.error('Error asegurando esquema en PostgreSQL:', err);
  }
}

export * from './schema';
export * from 'drizzle-orm';
