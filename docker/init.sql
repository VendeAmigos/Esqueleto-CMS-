-- docker/init.sql
-- Inicialización automática de PostgreSQL en Docker

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  grid_span TEXT NOT NULL DEFAULT 'col-1',
  display_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS grid_span TEXT NOT NULL DEFAULT 'col-1';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS product_modifiers (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single',
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifier_options (
  id TEXT PRIMARY KEY,
  modifier_id TEXT NOT NULL REFERENCES product_modifiers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_delta INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total INTEGER NOT NULL,
  customer_email TEXT,
  items_summary TEXT,
  items_json TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Categorías con Imágenes de Alta Calidad y Tamaños de Grid
-- ============================================================
INSERT INTO categories (id, name, slug, image_url, grid_span, display_order)
VALUES 
  ('cat-ropa-01', 'Ropa y Estilo', 'ropa', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=900&auto=format&fit=crop&q=80', 'col-2', 1),
  ('cat-tec-02', 'Tecnología', 'tecnologia', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&auto=format&fit=crop&q=80', 'col-1', 2),
  ('cat-gourmet-03', 'Café & Gourmet', 'gourmet', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&auto=format&fit=crop&q=80', 'col-1', 3),
  ('cat-acc-04', 'Accesorios', 'accesorios', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&auto=format&fit=crop&q=80', 'col-2', 4)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  slug = EXCLUDED.slug,
  image_url = EXCLUDED.image_url,
  grid_span = EXCLUDED.grid_span,
  display_order = EXCLUDED.display_order;

-- ============================================================
-- Productos con Imágenes Reales y Modificadores de Precio
-- ============================================================

-- 1. Playera
INSERT INTO products (id, title, description, image_url, base_price, is_active, is_featured, category_id)
VALUES (
  'prod-playera-01',
  'Playera Heavyweight Streetwear',
  'Corte boxy fit confeccionada en 100% algodón pesado de 240 GSM. Durabilidad y caída impecable.',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
  34900,
  true,
  true,
  'cat-ropa-01'
) ON CONFLICT (id) DO UPDATE SET is_featured = EXCLUDED.is_featured;

INSERT INTO product_modifiers (id, product_id, name, type, required)
VALUES 
  ('mod-playera-talla', 'prod-playera-01', 'Talla', 'single', true),
  ('mod-playera-color', 'prod-playera-01', 'Color', 'single', true),
  ('mod-playera-regalo', 'prod-playera-01', 'Empaque Especial', 'multiple', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, is_default)
VALUES
  ('opt-talla-s', 'mod-playera-talla', 'Chica (S)', 0, true),
  ('opt-talla-m', 'mod-playera-talla', 'Mediana (M)', 0, false),
  ('opt-talla-l', 'mod-playera-talla', 'Grande (L)', 3000, false),
  ('opt-talla-xl', 'mod-playera-talla', 'Extra Grande (XL)', 5000, false),
  ('opt-color-negro', 'mod-playera-color', 'Negro Carbón', 0, true),
  ('opt-color-blanco', 'mod-playera-color', 'Blanco Vintage', 0, false),
  ('opt-color-verde', 'mod-playera-color', 'Verde Militar', 2000, false),
  ('opt-regalo-caja', 'mod-playera-regalo', 'Caja Premium con Lazo y Tarjeta', 4500, false)
ON CONFLICT (id) DO NOTHING;

-- 2. Audífonos
INSERT INTO products (id, title, description, image_url, base_price, is_active, is_featured, category_id)
VALUES (
  'prod-audifonos-02',
  'Audífonos Over-Ear Pro ANC',
  'Cancelación activa de ruido híbrida de 40dB, transductores de 40mm de biocelulosa y hasta 65h de batería.',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  159900,
  true,
  true,
  'cat-tec-02'
) ON CONFLICT (id) DO UPDATE SET is_featured = EXCLUDED.is_featured;

INSERT INTO product_modifiers (id, product_id, name, type, required)
VALUES 
  ('mod-aud-acabado', 'prod-audifonos-02', 'Acabado y Material', 'single', true),
  ('mod-aud-garantia', 'prod-audifonos-02', 'Cobertura Adicional', 'single', false),
  ('mod-aud-extras', 'prod-audifonos-02', 'Complementos de Audio', 'multiple', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, is_default)
VALUES
  ('opt-aud-negro', 'mod-aud-acabado', 'Negro Mate Grafito', 0, true),
  ('opt-aud-plata', 'mod-aud-acabado', 'Plata Cepillada Espacial', 15000, false),
  ('opt-aud-medianoche', 'mod-aud-acabado', 'Edición Especial Medianoche', 25000, false),
  ('opt-aud-gar1', 'mod-aud-garantia', 'Garantía Estándar 1 Año', 0, true),
  ('opt-aud-gar2', 'mod-aud-garantia', 'Garantía Extendida Total 2 Años', 29900, false),
  ('opt-aud-estuche', 'mod-aud-extras', 'Estuche Rígido de Viaje Anti-impactos', 18000, false),
  ('opt-aud-almohadillas', 'mod-aud-extras', 'Almohadillas Reemplazables de Gel', 12000, false)
ON CONFLICT (id) DO NOTHING;

-- 3. Smartwatch
INSERT INTO products (id, title, description, image_url, base_price, is_active, is_featured, category_id)
VALUES (
  'prod-smartwatch-03',
  'Smartwatch Cronógrafo Titanium V3',
  'Bisel de titanio aeroespacial grado 5, pantalla AMOLED Always-On protegida por cristal de zafiro y GPS dual.',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  249900,
  true,
  true,
  'cat-tec-02'
) ON CONFLICT (id) DO UPDATE SET is_featured = EXCLUDED.is_featured;

INSERT INTO product_modifiers (id, product_id, name, type, required)
VALUES 
  ('mod-watch-correa', 'prod-smartwatch-03', 'Tipo de Correa', 'single', true),
  ('mod-watch-mica', 'prod-smartwatch-03', 'Protección', 'multiple', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, is_default)
VALUES
  ('opt-watch-silicon', 'mod-watch-correa', 'Silicón Fluoroelastómero Deportivo', 0, true),
  ('opt-watch-cuero', 'mod-watch-correa', 'Cuero Genuino Café Tostado', 35000, false),
  ('opt-watch-acero', 'mod-watch-correa', 'Eslabones de Acero y Titanio', 45000, false),
  ('opt-watch-cristal', 'mod-watch-mica', 'Mica de Cristal Templado 9H Instalada', 9900, false)
ON CONFLICT (id) DO NOTHING;

-- 4. Café
INSERT INTO products (id, title, description, image_url, base_price, is_active, is_featured, category_id)
VALUES (
  'prod-cafe-04',
  'Café de Especialidad Chiapas Finca 500g',
  'Granos 100% Arábica de altura (1,450 msnm), notas de chocolate oscuro, miel de azahar y nuez tostada.',
  'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&auto=format&fit=crop&q=80',
  22000,
  true,
  true,
  'cat-gourmet-03'
) ON CONFLICT (id) DO UPDATE SET is_featured = EXCLUDED.is_featured;

INSERT INTO product_modifiers (id, product_id, name, type, required)
VALUES 
  ('mod-cafe-molienda', 'prod-cafe-04', 'Tipo de Molienda', 'single', true),
  ('mod-cafe-tueste', 'prod-cafe-04', 'Nivel de Tueste', 'single', true),
  ('mod-cafe-vaso', 'prod-cafe-04', 'Extras Gourmet', 'multiple', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, is_default)
VALUES
  ('opt-cafe-grano', 'mod-cafe-molienda', 'Grano Entero (Recomendado)', 0, true),
  ('opt-cafe-espresso', 'mod-cafe-molienda', 'Molido Fino (Espresso)', 1000, false),
  ('opt-cafe-filtro', 'mod-cafe-molienda', 'Molido Medio (Filtro / V60)', 1000, false),
  ('opt-cafe-prensa', 'mod-cafe-molienda', 'Molido Grueso (Prensa Francesa)', 1000, false),
  ('opt-cafe-tueste-medio', 'mod-cafe-tueste', 'Tueste Medio Cacao', 0, true),
  ('opt-cafe-tueste-obscuro', 'mod-cafe-tueste', 'Tueste Obscuro Intenso', 1500, false),
  ('opt-cafe-vaso-termico', 'mod-cafe-vaso', 'Vaso Térmico de Viaje Acero', 18000, false)
ON CONFLICT (id) DO NOTHING;

-- 5. Mochila
INSERT INTO products (id, title, description, image_url, base_price, is_active, is_featured, category_id)
VALUES (
  'prod-mochila-05',
  'Mochila Técnica Urbana Impermeable 25L',
  'Tejido Cordura balístico 1000D repelente al agua, compartimento acolchado para laptop de hasta 16" y cremalleras YKK.',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
  89900,
  true,
  true,
  'cat-acc-04'
) ON CONFLICT (id) DO UPDATE SET is_featured = EXCLUDED.is_featured;

INSERT INTO product_modifiers (id, product_id, name, type, required)
VALUES 
  ('mod-mochila-color', 'prod-mochila-05', 'Color de Tela', 'single', true),
  ('mod-mochila-acc', 'prod-mochila-05', 'Accesorios Compatibles', 'multiple', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, is_default)
VALUES
  ('opt-mochila-oxford', 'mod-mochila-color', 'Gris Oxford Técnico', 0, true),
  ('opt-mochila-tactico', 'mod-mochila-color', 'Negro Táctico', 0, false),
  ('opt-mochila-marino', 'mod-mochila-color', 'Azul Marino Profundo', 5000, false),
  ('opt-mochila-powerbank', 'mod-mochila-acc', 'Powerbank Ultra-Slim 10,000 mAh', 29900, false),
  ('opt-mochila-funda', 'mod-mochila-acc', 'Cubre-mochila Fluo para Lluvia', 8900, false)
ON CONFLICT (id) DO NOTHING;

-- 6. Gorra
INSERT INTO products (id, title, description, image_url, base_price, is_active, category_id)
VALUES (
  'prod-gorra-06',
  'Gorra Snapback Premium Estructurada',
  'Corona estructurada de 6 paneles en mezcla de lana peinada con visera plana moldeable y cierre retro ajustable.',
  'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80',
  29900,
  true,
  'cat-acc-04'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_modifiers (id, product_id, name, type, required)
VALUES 
  ('mod-gorra-color', 'prod-gorra-06', 'Color Base', 'single', true),
  ('mod-gorra-bordado', 'prod-gorra-06', 'Bordado Personalizado', 'single', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, is_default)
VALUES
  ('opt-gorra-negro', 'mod-gorra-color', 'Negro Monocromático', 0, true),
  ('opt-gorra-melange', 'mod-gorra-color', 'Gris Melange', 0, false),
  ('opt-gorra-beige', 'mod-gorra-color', 'Beige Desierto', 2000, false),
  ('opt-gorra-liso', 'mod-gorra-bordado', 'Sin Bordado (Liso)', 0, true),
  ('opt-gorra-iniciales', 'mod-gorra-bordado', 'Iniciales Bordadas en Hilo Plata', 6000, false),
  ('opt-gorra-3d', 'mod-gorra-bordado', 'Logo Custom Frontal en Relieve 3D', 9500, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Usuario Administrador por Defecto
-- ============================================================
INSERT INTO users (id, email, password_hash, role)
VALUES ('admin-01', 'admin@esqueleto.local', 'esqueleto_hash', 'admin')
ON CONFLICT (email) DO NOTHING;
