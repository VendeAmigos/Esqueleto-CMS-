import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

let connectionString =
  process.env.DATABASE_URL ||
  'postgres://admin:admin123@127.0.0.1:5432/esqueleto';

connectionString = connectionString.replace('@localhost:', '@127.0.0.1:');

const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function initSchema() {
  console.log('Verificando y asegurando esquema en PostgreSQL...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      image_url TEXT,
      grid_span TEXT NOT NULL DEFAULT '1x1',
      display_order INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sql`
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
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS product_modifiers (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'single',
      required BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS modifier_options (
      id TEXT PRIMARY KEY,
      modifier_id TEXT NOT NULL REFERENCES product_modifiers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price_delta INTEGER NOT NULL DEFAULT 0,
      is_default BOOLEAN NOT NULL DEFAULT false
    );
  `;

  await sql`
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
  `;

  await sql`
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
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
}

export async function seed() {
  console.log('🎨 Iniciando proceso de seed temático para Ilustradora...');
  await initSchema();

  // 1. Limpieza de datos previos para regeneración limpia
  console.log('Limpiando catálogo previo...');
  await sql`DELETE FROM modifier_options;`;
  await sql`DELETE FROM product_modifiers;`;
  await sql`DELETE FROM products;`;
  await sql`DELETE FROM categories;`;

  // 2. Categorías de Merch de Ilustradora con Grids Variados
  console.log('Creando categorías de arte e ilustración con Bento Grid...');
  const catPrintsId = 'cat-prints-01';
  const catStickersId = 'cat-stickers-02';
  const catAccesoriosId = 'cat-acc-03';
  const catTextilId = 'cat-textil-04';
  const catOriginalesId = 'cat-orig-05';

  await sql`
    INSERT INTO categories (id, name, slug, image_url, grid_span, display_order)
    VALUES 
      (
        ${catPrintsId}, 
        'Prints & Láminas de Arte', 
        'prints-arte', 
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80',
        '2x2', 
        1
      ),
      (
        ${catStickersId}, 
        'Stickers & Papelería', 
        'stickers-papeleria', 
        'https://images.unsplash.com/photo-1589998059171-988d887df646?w=900&auto=format&fit=crop&q=80',
        '2x1', 
        2
      ),
      (
        ${catAccesoriosId}, 
        'Pines & Llaveros Acrílicos', 
        'pines-llaveros', 
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
        '1x2', 
        3
      ),
      (
        ${catTextilId}, 
        'Merch Textil & Totebags', 
        'merch-textil', 
        'https://images.unsplash.com/photo-1544816155-12df9643f363?w=900&auto=format&fit=crop&q=80',
        '2x1', 
        4
      ),
      (
        ${catOriginalesId}, 
        'Obras Originales & Libretas', 
        'obras-originales', 
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&auto=format&fit=crop&q=80',
        '1x1', 
        5
      )
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name, 
      slug = EXCLUDED.slug,
      image_url = EXCLUDED.image_url,
      grid_span = EXCLUDED.grid_span,
      display_order = EXCLUDED.display_order;
  `;

  // 3. Productos Reales de Ilustradora con Precios Acordes y Opciones
  console.log('Creando productos de merch de ilustradora...');
  const productsData = [
    {
      id: 'prod-print-jardin',
      title: 'Print Fine Art "El Jardín de los Recuerdos"',
      description: 'Lámina de ilustración impresa en papel algodón de 310g con tintas pigmentadas de archivo. Colores vibrantes de larga duración.',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
      basePrice: 18000, // $180.00 MXN
      isFeatured: true,
      categoryId: catPrintsId,
      modifiers: [
        {
          name: 'Tamaño de Lámina',
          type: 'single',
          required: true,
          options: [
            { name: 'A5 (14.8 x 21 cm)', priceDelta: 0, isDefault: true },
            { name: 'A4 (21 x 29.7 cm)', priceDelta: 6000, isDefault: false }, // +$60.00
            { name: 'A3 (29.7 x 42 cm)', priceDelta: 14000, isDefault: false }, // +$140.00
          ]
        },
        {
          name: 'Acabado Artístico',
          type: 'single',
          required: true,
          options: [
            { name: 'Papel Algodón Mate Suave', priceDelta: 0, isDefault: true },
            { name: 'Efecto Holográfico Glass', priceDelta: 3000, isDefault: false }, // +$30.00
            { name: 'Detalles en Foil Dorado Metalizado', priceDelta: 5000, isDefault: false }, // +$50.00
          ]
        },
        {
          name: 'Personalización',
          type: 'multiple',
          required: false,
          options: [
            { name: 'Firma y Dedicatoria de la Autora en el Reverso', priceDelta: 2500, isDefault: false }, // +$25.00
          ]
        }
      ]
    },
    {
      id: 'prod-print-estrellas',
      title: 'Lámina de Autor "Cazadora de Estrellas"',
      description: 'Ilustración digital de atmósfera nocturna y fantasía botánica sobre papel texturizado texturizado Fine Art.',
      imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=80',
      basePrice: 22000, // $220.00 MXN
      isFeatured: true,
      categoryId: catPrintsId,
      modifiers: [
        {
          name: 'Tamaño',
          type: 'single',
          required: true,
          options: [
            { name: 'A4 (21 x 30 cm)', priceDelta: 0, isDefault: true },
            { name: 'A3 Grande (30 x 42 cm)', priceDelta: 12000, isDefault: false }, // +$120.00
          ]
        },
        {
          name: 'Opción de Enmarcado',
          type: 'single',
          required: false,
          options: [
            { name: 'Sin Enmarcar (En tubo protector)', priceDelta: 0, isDefault: true },
            { name: 'Marco Madera Clara con Paspartú', priceDelta: 19000, isDefault: false }, // +$190.00
            { name: 'Marco Negro Minimalista', priceDelta: 19000, isDefault: false }, // +$190.00
          ]
        }
      ]
    },
    {
      id: 'prod-pack-stickers',
      title: 'Pack de 6 Stickers Holográficos "Criaturas Mágicas"',
      description: 'Set de 6 adhesivos de vinilo grueso ultra-resistente al agua, raspaduras y sol UV. Brillo holográfico premium.',
      imageUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=800&auto=format&fit=crop&q=80',
      basePrice: 9500, // $95.00 MXN
      isFeatured: true,
      categoryId: catStickersId,
      modifiers: [
        {
          name: 'Tipo de Laminado',
          type: 'single',
          required: true,
          options: [
            { name: 'Holográfico Arcoíris Especial', priceDelta: 0, isDefault: true },
            { name: 'Glitter Polvo de Estrellas', priceDelta: 1500, isDefault: false }, // +$15.00
            { name: 'Vinilo Mate Suave', priceDelta: -1000, isDefault: false }, // -$10.00
          ]
        }
      ]
    },
    {
      id: 'prod-pin-corazon',
      title: 'Pin Metálico Esmaltado "Corazón Florecido" (Hard Enamel)',
      description: 'Broche metálico coleccionable de 3.5cm en esmalte duro pulido con baño en oro y tarjeta ilustrada de respaldo.',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      basePrice: 14000, // $140.00 MXN
      isFeatured: true,
      categoryId: catAccesoriosId,
      modifiers: [
        {
          name: 'Baño Metálico',
          type: 'single',
          required: true,
          options: [
            { name: 'Oro Brillante (Gold Plated)', priceDelta: 0, isDefault: true },
            { name: 'Oro Rosa Pastel', priceDelta: 1500, isDefault: false }, // +$15.00
            { name: 'Plata Antigua Cepillada', priceDelta: 1000, isDefault: false }, // +$10.00
          ]
        },
        {
          name: 'Cierre Posterior',
          type: 'single',
          required: true,
          options: [
            { name: 'Cierre de Goma Negra Antideslizante', priceDelta: 0, isDefault: true },
            { name: 'Cierre Metálico Deluxe con Seguro a Presión', priceDelta: 2000, isDefault: false }, // +$20.00
          ]
        }
      ]
    },
    {
      id: 'prod-llavero-zorro',
      title: 'Llavero Acrílico Translúcido Glitter "Zorro Astral"',
      description: 'Llavero de doble cara de acrílico resistente de 6.5cm con destellos glitter suspendidos y capa epóxica anti-rayas.',
      imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80',
      basePrice: 12500, // $125.00 MXN
      isFeatured: false,
      categoryId: catAccesoriosId,
      modifiers: [
        {
          name: 'Tipo de Gancho',
          type: 'single',
          required: true,
          options: [
            { name: 'Broche Forma de Corazón Dorado', priceDelta: 0, isDefault: true },
            { name: 'Broche Forma de Estrella Plateada', priceDelta: 1000, isDefault: false }, // +$10.00
            { name: 'Mosquetón Giratorio Clásico', priceDelta: 0, isDefault: false },
          ]
        }
      ]
    },
    {
      id: 'prod-totebag-lectura',
      title: 'Totebag Ilustrada "Lectura Nocturna" (100% Algodón Pesado)',
      description: 'Bolsa de lona resistente de 320g con serigrafía artesanal duradera. Perfecta para libros, libretas y compras.',
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
      basePrice: 28000, // $280.00 MXN
      isFeatured: false,
      categoryId: catTextilId,
      modifiers: [
        {
          name: 'Color de Tela',
          type: 'single',
          required: true,
          options: [
            { name: 'Crudo Natural Sin Blanquear', priceDelta: 0, isDefault: true },
            { name: 'Negro Profundo', priceDelta: 3000, isDefault: false }, // +$30.00
          ]
        },
        {
          name: 'Extras de Costura',
          type: 'single',
          required: false,
          options: [
            { name: 'Bolsa Abierta Clásica', priceDelta: 0, isDefault: true },
            { name: 'Con Cremallera Superior y Bolsillo Interno', priceDelta: 4500, isDefault: false }, // +$45.00
          ]
        }
      ]
    },
    {
      id: 'prod-hoodie-eclipse',
      title: 'Hoodie Oversize Bordada "Eclipse Floral"',
      description: 'Sudadera con capucha en felpa perchada de 340g con bordado de alta densidad en el pecho y print dorsal.',
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
      basePrice: 65000, // $650.00 MXN
      isFeatured: false,
      categoryId: catTextilId,
      modifiers: [
        {
          name: 'Talla',
          type: 'single',
          required: true,
          options: [
            { name: 'Chica (S)', priceDelta: 0, isDefault: true },
            { name: 'Mediana (M)', priceDelta: 0, isDefault: false },
            { name: 'Grande (L)', priceDelta: 0, isDefault: false },
            { name: 'Extra Grande (XL)', priceDelta: 4000, isDefault: false }, // +$40.00
          ]
        },
        {
          name: 'Color de Prenda',
          type: 'single',
          required: true,
          options: [
            { name: 'Lavanda Pastel', priceDelta: 0, isDefault: true },
            { name: 'Negro Carbón', priceDelta: 0, isDefault: false },
            { name: 'Verde Salvia', priceDelta: 2000, isDefault: false }, // +$20.00
          ]
        }
      ]
    },
    {
      id: 'prod-sketchbook-autor',
      title: 'Sketchbook Tapa Dura "Pinceladas del Alma" (200g)',
      description: 'Cuaderno cosido a mano con 160 páginas en papel mix media libre de ácido. Ideal para gouache, tinta y acuarela.',
      imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80',
      basePrice: 24000, // $240.00 MXN
      isFeatured: false,
      categoryId: catOriginalesId,
      modifiers: [
        {
          name: 'Tipo de Papel Interior',
          type: 'single',
          required: true,
          options: [
            { name: 'Papel Mix Media Liso 200g (Gouache/Tinta)', priceDelta: 0, isDefault: true },
            { name: 'Papel Acuarela Grano Fino 300g 100% Algodón', priceDelta: 7000, isDefault: false }, // +$70.00
          ]
        },
        {
          name: 'Cierre y Marcador',
          type: 'single',
          required: false,
          options: [
            { name: 'Cinta Elástica y Cinta Marcapáginas', priceDelta: 0, isDefault: true },
            { name: 'Con Porta-Pinceles Incorporado', priceDelta: 3500, isDefault: false }, // +$35.00
          ]
        }
      ]
    }
  ];

  for (const item of productsData) {
    await sql`
      INSERT INTO products (id, title, description, image_url, base_price, is_active, is_featured, category_id)
      VALUES (
        ${item.id}, 
        ${item.title}, 
        ${item.description}, 
        ${item.imageUrl}, 
        ${item.basePrice}, 
        true, 
        ${item.isFeatured},
        ${item.categoryId}
      );
    `;

    for (const mod of item.modifiers) {
      const modId = crypto.randomUUID();
      await sql`
        INSERT INTO product_modifiers (id, product_id, name, type, required)
        VALUES (${modId}, ${item.id}, ${mod.name}, ${mod.type}, ${mod.required});
      `;

      for (const opt of mod.options) {
        const optId = crypto.randomUUID();
        await sql`
          INSERT INTO modifier_options (id, modifier_id, name, price_delta, is_default)
          VALUES (${optId}, ${modId}, ${opt.name}, ${opt.priceDelta}, ${opt.isDefault});
        `;
      }
    }
  }

  // 4. Cupones de Descuento Iniciales para la Ilustradora
  console.log('Creando cupones de descuento iniciales...');
  await sql`
    INSERT INTO discount_codes (id, code, description, discount_type, discount_value, min_purchase, max_discount, usage_limit, is_active)
    VALUES 
      ('disc-01', 'ARTE10', '10% de descuento de bienvenida en cualquier compra de arte', 'percentage', 10, 0, NULL, 500, true),
      ('disc-02', 'PRINTS20', '20% de descuento en pedidos mayores a $300 MXN', 'percentage', 20, 30000, 15000, 200, true),
      ('disc-03', 'REGALO50', '$50 MXN de regalo directo en compras mayores a $250 MXN', 'fixed', 5000, 25000, NULL, 100, true)
    ON CONFLICT (code) DO NOTHING;
  `;

  // 5. Configuración de Marca y Banner Hero de la Ilustradora
  console.log('Configurando marca y apariencia de la tienda...');
  await sql`
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
    )
    ON CONFLICT (id) DO UPDATE SET
      site_name = EXCLUDED.site_name,
      logo_color = EXCLUDED.logo_color,
      hero_title = EXCLUDED.hero_title,
      hero_subtitle = EXCLUDED.hero_subtitle,
      hero_image_url = EXCLUDED.hero_image_url,
      hero_cta_text = EXCLUDED.hero_cta_text,
      hero_cta_link = EXCLUDED.hero_cta_link;
  `;

  // 6. Usuario Administrador por defecto
  console.log('Asegurando usuario administrador...');
  await sql`
    INSERT INTO users (id, email, password_hash, role)
    VALUES ('admin-01', 'admin@esqueleto.local', 'esqueleto_hash', 'admin')
    ON CONFLICT (email) DO NOTHING;
  `;

  console.log('✅ Tienda de Ilustradora poblada con éxito: categorías, productos, cupones y apariencia.');
  await sql.end();
}

seed().catch((err) => {
  console.error('❌ Error en el proceso de seed:', err);
  process.exit(1);
});
