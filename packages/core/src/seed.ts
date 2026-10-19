import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://admin:admin123@localhost:5432/esqueleto';

const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function initSchema() {
  console.log('Verificando y creando tablas si no existen...');

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
      slug TEXT NOT NULL UNIQUE
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
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sql`
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
  `;
}

export async function seed() {
  console.log('Iniciando proceso de seeding en PostgreSQL...');
  await initSchema();

  // 1. Categorías
  console.log('Creando categorías...');
  const catRopaId = 'cat-ropa-01';
  const catTecnologiaId = 'cat-tec-02';
  const catGourmetId = 'cat-gourmet-03';
  const catAccesoriosId = 'cat-acc-04';

  await sql`
    INSERT INTO categories (id, name, slug)
    VALUES 
      (${catRopaId}, 'Ropa y Estilo', 'ropa'),
      (${catTecnologiaId}, 'Tecnología', 'tecnologia'),
      (${catGourmetId}, 'Café & Gourmet', 'gourmet'),
      (${catAccesoriosId}, 'Accesorios', 'accesorios')
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name, 
      slug = EXCLUDED.slug;
  `;

  // 2. Limpieza de modificadores y productos existentes para una recarga limpia y modificable
  console.log('Actualizando catálogo de productos y modificadores...');
  await sql`DELETE FROM modifier_options;`;
  await sql`DELETE FROM product_modifiers;`;
  await sql`DELETE FROM products;`;

  // 3. Productos con Imágenes Reales y Modificadores
  const productsData = [
    {
      id: 'prod-playera-01',
      title: 'Playera Heavyweight Streetwear',
      description: 'Corte boxy fit confeccionada en 100% algodón pesado de 240 GSM. Durabilidad y caída impecable.',
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      basePrice: 34900, // $349.00 MXN
      categoryId: catRopaId,
      modifiers: [
        {
          name: 'Talla',
          type: 'single',
          required: true,
          options: [
            { name: 'Chica (S)', priceDelta: 0, isDefault: true },
            { name: 'Mediana (M)', priceDelta: 0, isDefault: false },
            { name: 'Grande (L)', priceDelta: 3000, isDefault: false }, // +$30.00
            { name: 'Extra Grande (XL)', priceDelta: 5000, isDefault: false }, // +$50.00
          ]
        },
        {
          name: 'Color',
          type: 'single',
          required: true,
          options: [
            { name: 'Negro Carbón', priceDelta: 0, isDefault: true },
            { name: 'Blanco Vintage', priceDelta: 0, isDefault: false },
            { name: 'Verde Militar', priceDelta: 2000, isDefault: false }, // +$20.00
          ]
        },
        {
          name: 'Empaque de Regalo',
          type: 'multiple',
          required: false,
          options: [
            { name: 'Caja Premium con Lazo y Tarjeta', priceDelta: 4500, isDefault: false }, // +$45.00
          ]
        }
      ]
    },
    {
      id: 'prod-audifonos-02',
      title: 'Audífonos Over-Ear Pro ANC',
      description: 'Cancelación activa de ruido híbrida de 40dB, transductores de 40mm de biocelulosa y hasta 65h de batería.',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      basePrice: 159900, // $1,599.00 MXN
      categoryId: catTecnologiaId,
      modifiers: [
        {
          name: 'Acabado y Material',
          type: 'single',
          required: true,
          options: [
            { name: 'Negro Mate Grafito', priceDelta: 0, isDefault: true },
            { name: 'Plata Cepillada Espacial', priceDelta: 15000, isDefault: false }, // +$150.00
            { name: 'Edición Especial Medianoche', priceDelta: 25000, isDefault: false }, // +$250.00
          ]
        },
        {
          name: 'Cobertura Adicional',
          type: 'single',
          required: false,
          options: [
            { name: 'Garantía Estándar 1 Año', priceDelta: 0, isDefault: true },
            { name: 'Garantía Extendida Total 2 Años', priceDelta: 29900, isDefault: false }, // +$299.00
          ]
        },
        {
          name: 'Complementos de Audio',
          type: 'multiple',
          required: false,
          options: [
            { name: 'Estuche Rígido de Viaje Anti-impactos', priceDelta: 18000, isDefault: false }, // +$180.00
            { name: 'Almohadillas Reemplazables de Gel Refrigerante', priceDelta: 12000, isDefault: false }, // +$120.00
          ]
        }
      ]
    },
    {
      id: 'prod-smartwatch-03',
      title: 'Smartwatch Cronógrafo Titanium V3',
      description: 'Bisel de titanio aeroespacial grado 5, pantalla AMOLED Always-On protegida por cristal de zafiro y GPS dual.',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      basePrice: 249900, // $2,499.00 MXN
      categoryId: catTecnologiaId,
      modifiers: [
        {
          name: 'Tipo de Correa',
          type: 'single',
          required: true,
          options: [
            { name: 'Silicón Fluoroelastómero Deportivo', priceDelta: 0, isDefault: true },
            { name: 'Cuero Genuino Café Tostado', priceDelta: 35000, isDefault: false }, // +$350.00
            { name: 'Eslabones de Acero Inoxidable y Titanio', priceDelta: 45000, isDefault: false }, // +$450.00
          ]
        },
        {
          name: 'Protección',
          type: 'multiple',
          required: false,
          options: [
            { name: 'Mica de Cristal Templado 9H Instalada', priceDelta: 9900, isDefault: false }, // +$99.00
          ]
        }
      ]
    },
    {
      id: 'prod-cafe-04',
      title: 'Café de Especialidad Chiapas Finca 500g',
      description: 'Granos 100% Arábica de altura (1,450 msnm), notas de chocolate oscuro, miel de azahar y nuez tostada.',
      imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&auto=format&fit=crop&q=80',
      basePrice: 22000, // $220.00 MXN
      categoryId: catGourmetId,
      modifiers: [
        {
          name: 'Tipo de Molienda',
          type: 'single',
          required: true,
          options: [
            { name: 'Grano Entero (Recomendado)', priceDelta: 0, isDefault: true },
            { name: 'Molido Fino (Espresso)', priceDelta: 1000, isDefault: false }, // +$10.00
            { name: 'Molido Medio (Filtro / V60)', priceDelta: 1000, isDefault: false }, // +$10.00
            { name: 'Molido Grueso (Prensa Francesa / Cold Brew)', priceDelta: 1000, isDefault: false }, // +$10.00
          ]
        },
        {
          name: 'Nivel de Tueste',
          type: 'single',
          required: true,
          options: [
            { name: 'Tueste Medio Suave', priceDelta: 0, isDefault: true },
            { name: 'Tueste Obscuro Intenso', priceDelta: 1500, isDefault: false }, // +$15.00
          ]
        },
        {
          name: 'Extras Gourmet',
          type: 'multiple',
          required: false,
          options: [
            { name: 'Vaso Térmico de Viaje Doble Pared Acero', priceDelta: 18000, isDefault: false }, // +$180.00
          ]
        }
      ]
    },
    {
      id: 'prod-mochila-05',
      title: 'Mochila Técnica Urbana Impermeable 25L',
      description: 'Tejido Cordura balístico 1000D repelente al agua, compartimento acolchado para laptop de hasta 16" y cremalleras YKK.',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
      basePrice: 89900, // $899.00 MXN
      categoryId: catAccesoriosId,
      modifiers: [
        {
          name: 'Color de Tela',
          type: 'single',
          required: true,
          options: [
            { name: 'Gris Oxford Técnico', priceDelta: 0, isDefault: true },
            { name: 'Negro Táctico', priceDelta: 0, isDefault: false },
            { name: 'Azul Marino Profundo', priceDelta: 5000, isDefault: false }, // +$50.00
          ]
        },
        {
          name: 'Accesorios Compatibles',
          type: 'multiple',
          required: false,
          options: [
            { name: 'Powerbank Ultra-Slim 10,000 mAh', priceDelta: 29900, isDefault: false }, // +$299.00
            { name: 'Cubre-mochila Fluo Reflectante para Lluvia', priceDelta: 8900, isDefault: false }, // +$89.00
          ]
        }
      ]
    },
    {
      id: 'prod-gorra-06',
      title: 'Gorra Snapback Premium Estructurada',
      description: 'Corona estructurada de 6 paneles en mezcla de lana peinada con visera plana moldeable y cierre retro ajustable.',
      imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80',
      basePrice: 29900, // $299.00 MXN
      categoryId: catAccesoriosId,
      modifiers: [
        {
          name: 'Color Base',
          type: 'single',
          required: true,
          options: [
            { name: 'Negro Monocromático', priceDelta: 0, isDefault: true },
            { name: 'Gris Carbón', priceDelta: 0, isDefault: false },
            { name: 'Beige Desierto', priceDelta: 2000, isDefault: false }, // +$20.00
          ]
        },
        {
          name: 'Bordado Personalizado',
          type: 'single',
          required: false,
          options: [
            { name: 'Sin Bordado (Liso)', priceDelta: 0, isDefault: true },
            { name: 'Iniciales Bordadas en Hilo Plata', priceDelta: 6000, isDefault: false }, // +$60.00
            { name: 'Logo Custom Frontal en Relieve 3D', priceDelta: 9500, isDefault: false }, // +$95.00
          ]
        }
      ]
    }
  ];

  for (const item of productsData) {
    // Insertar producto
    await sql`
      INSERT INTO products (id, title, description, image_url, base_price, is_active, category_id)
      VALUES (
        ${item.id}, 
        ${item.title}, 
        ${item.description}, 
        ${item.imageUrl}, 
        ${item.basePrice}, 
        true, 
        ${item.categoryId}
      );
    `;

    // Insertar modificadores y opciones
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

  // 4. Usuario Administrador por defecto
  console.log('Creando usuario administrador...');
  await sql`
    INSERT INTO users (id, email, password_hash, role)
    VALUES ('admin-01', 'admin@esqueleto.local', 'esqueleto_hash', 'admin')
    ON CONFLICT (email) DO NOTHING;
  `;

  console.log('✅ Base de datos inicializada y poblada exitosamente con productos, imágenes y modificadores.');
  await sql.end();
}

seed().catch((err) => {
  console.error('❌ Error en el proceso de seed:', err);
  process.exit(1);
});
