-- docker/init.sql
-- Inicialización automática de PostgreSQL en Docker para Tienda de Ilustradora

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
  grid_span TEXT NOT NULL DEFAULT '1x1',
  display_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS grid_span TEXT NOT NULL DEFAULT '1x1';
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
  site_name TEXT NOT NULL DEFAULT 'LUNA ART STUDIO',
  logo_svg TEXT,
  logo_color TEXT NOT NULL DEFAULT '#ec4899',
  hero_title TEXT NOT NULL DEFAULT 'Ilustración de Autor, Prints & Merch Exclusivo',
  hero_subtitle TEXT NOT NULL DEFAULT 'Láminas de arte fine art, stickers holográficos, pines esmaltados y papelería ilustrada para alegrar tu día a día.',
  hero_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&auto=format&fit=crop&q=80',
  hero_cta_text TEXT NOT NULL DEFAULT 'Explorar Tienda de Arte',
  hero_cta_link TEXT NOT NULL DEFAULT '/catalogo',
  heading_font TEXT NOT NULL DEFAULT 'Plus Jakarta Sans',
  body_font TEXT NOT NULL DEFAULT 'Inter',
  extended_config TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS heading_font TEXT NOT NULL DEFAULT 'Plus Jakarta Sans';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS body_font TEXT NOT NULL DEFAULT 'Inter';
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS extended_config TEXT;

INSERT INTO site_settings (id, site_name, logo_color, hero_title, hero_subtitle, hero_image_url, hero_cta_text, hero_cta_link)
VALUES (
  'default',
  'LUNA ART STUDIO',
  '#ec4899',
  'Ilustración de Autor, Prints & Merch Exclusivo',
  'Láminas de arte fine art, stickers holográficos, pines esmaltados y papelería ilustrada para alegrar tu día a día.',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&auto=format&fit=crop&q=80',
  'Explorar Tienda de Arte',
  '/catalogo'
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

CREATE TABLE IF NOT EXISTS discount_codes (
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
);

CREATE TABLE IF NOT EXISTS orders (
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
  customer_name TEXT,
  customer_phone TEXT,
  shipping_street TEXT,
  shipping_ext_number TEXT,
  shipping_int_number TEXT,
  shipping_neighborhood TEXT,
  shipping_municipality TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  shipping_references TEXT,
  shipping_lat DOUBLE PRECISION,
  shipping_lng DOUBLE PRECISION,
  location_source TEXT,
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  mp_enabled BOOLEAN NOT NULL DEFAULT false,
  mp_mode TEXT NOT NULL DEFAULT 'production',
  mp_public_key TEXT,
  mp_access_token TEXT,
  mp_webhook_secret TEXT,
  storefront_url TEXT,
  statement_descriptor TEXT NOT NULL DEFAULT 'TIENDA ONLINE',
  binary_mode BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================================
-- Categorías Iniciales (Bento Grid 2D)
-- ============================================================
INSERT INTO categories (id, name, slug, image_url, grid_span, display_order)
VALUES 
  ('cat-prints-01', 'Prints & Láminas de Arte', 'prints-arte', '/seed/cat-prints.jpg', '1x5@1,1|5x6', 1),
  ('cat-stickers-02', 'Stickers & Papelería', 'stickers-papeleria', '/seed/cat-stickers.jpg', '2x3@2,1|5x6', 2),
  ('cat-acc-03', 'Pines & Llaveros Acrílicos', 'pines-llaveros', '/seed/cat-pines.jpg', '1x4@5,1|5x6', 3),
  ('cat-textil-04', 'Merch Textil & Totebags', 'merch-textil', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=900&auto=format&fit=crop&q=80', '2x2@2,4|5x6', 4),
  ('cat-orig-05', 'Obras Originales & Libretas', 'obras-originales', 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&auto=format&fit=crop&q=80', '2x2@4,5|5x6', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Productos Iniciales
-- ============================================================
INSERT INTO products (id, title, description, image_url, base_price, is_active, is_featured, category_id)
VALUES
  ('prod-print-jardin', 'Print Fine Art "El Jardín de los Recuerdos"', 'Lámina de ilustración impresa en papel algodón de 310g con tintas pigmentadas de archivo. Colores vibrantes de larga duración.', '/seed/prod-print-jardin.jpg', 18000, true, true, 'cat-prints-01'),
  ('prod-print-estrellas', 'Lámina de Autor "Cazadora de Estrellas"', 'Ilustración digital de atmósfera nocturna y fantasía botánica sobre papel texturizado Fine Art.', 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=80', 22000, true, true, 'cat-prints-01'),
  ('prod-pack-stickers', 'Pack de 6 Stickers Holográficos "Criaturas Mágicas"', 'Set de 6 adhesivos de vinilo grueso ultra-resistente al agua, raspaduras y sol UV. Brillo holográfico premium.', '/seed/prod-stickers-criaturas.jpg', 9500, true, true, 'cat-stickers-02'),
  ('prod-pin-corazon', 'Pin Metálico Esmaltado "Corazón Florecido" (Hard Enamel)', 'Broche metálico coleccionable de 3.5cm en esmalte duro pulido con baño en oro y tarjeta ilustrada de respaldo.', '/seed/prod-pin-corazon.jpg', 14000, true, true, 'cat-acc-03'),
  ('prod-llavero-zorro', 'Llavero Acrílico Translúcido Glitter "Zorro Astral"', 'Llavero de doble cara de acrílico resistente de 6.5cm con destellos glitter suspendidos y capa epóxica anti-rayas.', '/seed/prod-llavero-zorro.jpg', 12500, true, false, 'cat-acc-03'),
  ('prod-totebag-lectura', 'Totebag Ilustrada "Lectura Nocturna" (100% Algodón Pesado)', 'Bolsa de lona resistente de 320g con serigrafía artesanal duradera. Perfecta para libros, libretas y compras.', '/seed/prod-totebag-lectura.jpg', 28000, true, false, 'cat-textil-04'),
  ('prod-hoodie-eclipse', 'Hoodie Oversize Bordada "Eclipse Floral"', 'Sudadera con capucha en felpa perchada de 340g con bordado de alta densidad en el pecho y print dorsal.', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80', 65000, true, false, 'cat-textil-04'),
  ('prod-sketchbook-autor', 'Sketchbook Tapa Dura "Pinceladas del Alma" (200g)', 'Cuaderno cosido a mano con 160 páginas en papel mix media libre de ácido. Ideal para gouache, tinta y acuarela.', '/seed/prod-sketchbook.jpg', 24000, true, false, 'cat-orig-05')
ON CONFLICT (id) DO NOTHING;

-- Modificadores Print Jardín
INSERT INTO product_modifiers (id, product_id, name, type, required)
VALUES 
  ('mod-jardin-size', 'prod-print-jardin', 'Tamaño de Lámina', 'single', true),
  ('mod-jardin-finish', 'prod-print-jardin', 'Acabado Artístico', 'single', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, is_default)
VALUES
  ('opt-jardin-a5', 'mod-jardin-size', 'A5 (14.8 x 21 cm)', 0, true),
  ('opt-jardin-a4', 'mod-jardin-size', 'A4 (21 x 29.7 cm)', 6000, false),
  ('opt-jardin-a3', 'mod-jardin-size', 'A3 (29.7 x 42 cm)', 14000, false),
  ('opt-jardin-matte', 'mod-jardin-finish', 'Papel Algodón Mate Suave', 0, true),
  ('opt-jardin-holo', 'mod-jardin-finish', 'Efecto Holográfico Glass', 3000, false)
ON CONFLICT (id) DO NOTHING;

-- Modificadores Stickers
INSERT INTO product_modifiers (id, product_id, name, type, required)
VALUES ('mod-stickers-lam', 'prod-pack-stickers', 'Tipo de Laminado', 'single', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO modifier_options (id, modifier_id, name, price_delta, is_default)
VALUES
  ('opt-stk-holo', 'mod-stickers-lam', 'Holográfico Arcoíris Especial', 0, true),
  ('opt-stk-glitter', 'mod-stickers-lam', 'Glitter Polvo de Estrellas', 1500, false),
  ('opt-stk-matte', 'mod-stickers-lam', 'Vinilo Mate Suave', -1000, false)
ON CONFLICT (id) DO NOTHING;

-- Cupones
INSERT INTO discount_codes (id, code, description, discount_type, discount_value, min_purchase, max_discount, usage_limit, is_active)
VALUES 
  ('disc-01', 'ARTE10', '10% de descuento de bienvenida en cualquier compra de arte', 'percentage', 10, 0, NULL, 500, true),
  ('disc-02', 'PRINTS20', '20% de descuento en pedidos mayores a $300 MXN', 'percentage', 20, 30000, 15000, 200, true),
  ('disc-03', 'REGALO50', '$50 MXN de regalo directo en compras mayores a $250 MXN', 'fixed', 5000, 25000, NULL, 100, true)
ON CONFLICT (code) DO NOTHING;

-- Usuario Admin
INSERT INTO users (id, email, password_hash, role)
VALUES ('admin-01', 'admin@esqueleto.local', 'esqueleto_hash', 'admin')
ON CONFLICT (email) DO NOTHING;
