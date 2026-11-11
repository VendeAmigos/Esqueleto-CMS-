import fs from 'node:fs';
import path from 'node:path';
import { db, isDatabaseAvailable, markDatabaseOffline, ensureSchema, eq, desc } from './index';
import {
  categories,
  products,
  productModifiers,
  modifierOptions,
  siteSettings,
  orders,
  type Category,
  type SiteSettings,
  type Order,
} from './schema';

export interface StoredCategoryWithCount extends Category {
  productCount: number;
}

export interface StoredModifierOption {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface StoredModifierGroup {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: StoredModifierOption[];
}

export interface StoredProduct {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  modifiers: StoredModifierGroup[];
}

export const DEFAULT_INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-prints-01',
    name: 'Prints & Láminas de Arte',
    slug: 'prints-arte',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=900&auto=format&fit=crop&q=80',
    gridSpan: '1x5@1,1|5x6',
    displayOrder: 1,
  },
  {
    id: 'cat-stickers-02',
    name: 'Stickers & Papelería',
    slug: 'stickers-papeleria',
    imageUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=900&auto=format&fit=crop&q=80',
    gridSpan: '2x3@2,1|5x6',
    displayOrder: 2,
  },
  {
    id: 'cat-acc-03',
    name: 'Pines & Llaveros Acrílicos',
    slug: 'pines-llaveros',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=900&auto=format&fit=crop&q=80',
    gridSpan: '1x4@5,1|5x6',
    displayOrder: 3,
  },
  {
    id: 'cat-textil-04',
    name: 'Merch Textil & Totebags',
    slug: 'merch-textil',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=900&auto=format&fit=crop&q=80',
    gridSpan: '2x2@2,4|5x6',
    displayOrder: 4,
  },
  {
    id: 'cat-orig-05',
    name: 'Obras Originales & Libretas',
    slug: 'obras-originales',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&auto=format&fit=crop&q=80',
    gridSpan: '2x2@4,5|5x6',
    displayOrder: 5,
  },
];

export const DEFAULT_INITIAL_PRODUCTS: StoredProduct[] = [
  {
    id: 'prod-print-jardin',
    title: 'Print Fine Art "El Jardín de los Recuerdos"',
    description:
      'Lámina de ilustración impresa en papel algodón de 310g con tintas pigmentadas de archivo. Colores vibrantes de larga duración.',
    imageUrl:
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    basePrice: 18000,
    isActive: true,
    isFeatured: true,
    categoryId: 'cat-prints-01',
    modifiers: [
      {
        id: 'mod-size-01',
        name: 'Tamaño de Lámina',
        type: 'single',
        required: true,
        options: [
          { id: 'opt-a5', name: 'A5 (14.8 x 21 cm)', priceDelta: 0, isDefault: true },
          { id: 'opt-a4', name: 'A4 (21 x 29.7 cm)', priceDelta: 6000, isDefault: false },
          { id: 'opt-a3', name: 'A3 (29.7 x 42 cm)', priceDelta: 14000, isDefault: false },
        ],
      },
    ],
  },
  {
    id: 'prod-print-estrellas',
    title: 'Lámina de Autor "Cazadora de Estrellas"',
    description:
      'Ilustración digital de atmósfera nocturna y fantasía botánica sobre papel texturizado Fine Art.',
    imageUrl:
      'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=80',
    basePrice: 22000,
    isActive: true,
    isFeatured: true,
    categoryId: 'cat-prints-01',
    modifiers: [],
  },
  {
    id: 'prod-pack-stickers-brujitas',
    title: 'Pack de Stickers Holográficos "Pequeñas Brujas"',
    description:
      'Set de 5 stickers resistentes al agua y al sol con acabado holográfico brillante arcoíris. Ideales para laptop, termo o libreta.',
    imageUrl:
      'https://images.unsplash.com/photo-1589998059171-988d887df646?w=800&auto=format&fit=crop&q=80',
    basePrice: 12000,
    isActive: true,
    isFeatured: true,
    categoryId: 'cat-stickers-02',
    modifiers: [],
  },
  {
    id: 'prod-pack-stickers',
    title: 'Pack de 6 Stickers Holográficos "Criaturas Mágicas"',
    description:
      'Set de 6 adhesivos de vinilo grueso ultra-resistente al agua, raspaduras y sol UV. Brillo holográfico premium.',
    imageUrl:
      'https://images.unsplash.com/photo-1589998059171-988d887df646?w=800&auto=format&fit=crop&q=80',
    basePrice: 9500,
    isActive: true,
    isFeatured: false,
    categoryId: 'cat-stickers-02',
    modifiers: [],
  },
  {
    id: 'prod-pin-gato-astral',
    title: 'Pin Metálico Esmaltado "Gato Cósmico"',
    description:
      'Pin de metal dorado con esmalte duro pulido (hard enamel) y cierre de goma doble para mayor seguridad.',
    imageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    basePrice: 15000,
    isActive: true,
    isFeatured: true,
    categoryId: 'cat-acc-03',
    modifiers: [],
  },
  {
    id: 'prod-pin-corazon',
    title: 'Pin Metálico Esmaltado "Corazón Florecido" (Hard Enamel)',
    description:
      'Broche metálico coleccionable de 3.5cm en esmalte duro pulido con baño en oro y tarjeta ilustrada de respaldo.',
    imageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    basePrice: 14000,
    isActive: true,
    isFeatured: false,
    categoryId: 'cat-acc-03',
    modifiers: [],
  },
  {
    id: 'prod-llavero-zorro',
    title: 'Llavero Acrílico Translúcido Glitter "Zorro Astral"',
    description:
      'Llavero de doble cara de acrílico resistente de 6.5cm con destellos glitter suspendidos y capa epóxica anti-rayas.',
    imageUrl:
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80',
    basePrice: 12500,
    isActive: true,
    isFeatured: false,
    categoryId: 'cat-acc-03',
    modifiers: [],
  },
  {
    id: 'prod-totebag-flora',
    title: 'Totebag 100% Algodón Pesado "Flora & Fauna"',
    description:
      'Bolsa de tela resistente de 280g/m² serigrafiada a 3 tintas con asas reforzadas para libros o compras.',
    imageUrl:
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    basePrice: 28000,
    isActive: true,
    isFeatured: true,
    categoryId: 'cat-textil-04',
    modifiers: [],
  },
  {
    id: 'prod-totebag-lectura',
    title: 'Totebag Ilustrada "Lectura Nocturna" (100% Algodón Pesado)',
    description:
      'Bolsa de lona resistente de 320g con serigrafía artesanal duradera. Perfecta para libros, libretas y compras.',
    imageUrl:
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    basePrice: 28000,
    isActive: true,
    isFeatured: false,
    categoryId: 'cat-textil-04',
    modifiers: [],
  },
  {
    id: 'prod-hoodie-eclipse',
    title: 'Hoodie Oversize Bordada "Eclipse Floral"',
    description:
      'Sudadera con capucha en felpa perchada de 340g con bordado de alta densidad en el pecho y print dorsal.',
    imageUrl:
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
    basePrice: 65000,
    isActive: true,
    isFeatured: false,
    categoryId: 'cat-textil-04',
    modifiers: [],
  },
  {
    id: 'prod-sketchbook-autor',
    title: 'Sketchbook Tapa Dura "Pinceladas del Alma" (200g)',
    description:
      'Cuaderno cosido a mano con 160 páginas en papel mix media libre de ácido. Ideal para gouache, tinta y acuarela.',
    imageUrl:
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80',
    basePrice: 24000,
    isActive: true,
    isFeatured: false,
    categoryId: 'cat-orig-05',
    modifiers: [],
  },
];

function getUploadsDir(): string {
  const cwd = process.cwd();
  const candidates = [
    process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : '',
    path.resolve(cwd, 'uploads'),
    path.resolve(cwd, '../../uploads'),
    path.resolve(cwd, '../uploads'),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  const fallbackDir = path.resolve(cwd, 'uploads');
  try {
    fs.mkdirSync(fallbackDir, { recursive: true });
  } catch {
    // ignore
  }
  return fallbackDir;
}

function getCmsDataDir(): string {
  const base = getUploadsDir();
  const cmsDir = path.join(base, '.cms-data');
  try {
    if (!fs.existsSync(cmsDir)) {
      fs.mkdirSync(cmsDir, { recursive: true });
    }
  } catch {
    // ignore
  }
  return cmsDir;
}

function resolveMigratedDataFile(filename: string): string {
  const target = path.join(getCmsDataDir(), filename);
  const legacy = path.join(getUploadsDir(), filename);
  try {
    if (!fs.existsSync(target) && fs.existsSync(legacy)) {
      fs.copyFileSync(legacy, target);
      fs.unlinkSync(legacy);
    }
  } catch {
    // ignore
  }
  return target;
}

function getSharedCategoriesPath(): string {
  return resolveMigratedDataFile('categories-grid.json');
}

function getSharedProductsPath(): string {
  return resolveMigratedDataFile('products-store.json');
}

function readLocalCategories(): Category[] {
  const filePath = getSharedCategoriesPath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      }
    }
  } catch (err) {
    console.warn('Error leyendo categories-grid.json local:', err);
  }

  return [...DEFAULT_INITIAL_CATEGORIES];
}

function writeLocalCategories(items: Category[]): void {
  const filePath = getSharedCategoriesPath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error guardando categories-grid.json local:', err);
  }
}

function readLocalProducts(): StoredProduct[] {
  const filePath = getSharedProductsPath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error leyendo products-store.json local:', err);
  }

  return [...DEFAULT_INITIAL_PRODUCTS];
}

function writeLocalProducts(items: StoredProduct[]): void {
  const filePath = getSharedProductsPath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error guardando products-store.json local:', err);
  }
}

/**
 * Obtiene las categorías desde PostgreSQL (si está activo) o desde el archivo JSON compartido
 * entre Admin y Storefront cuando se ejecuta `pnpm run dev` sin PostgreSQL.
 */
export async function getStoredCategories(): Promise<Category[]> {
  const filePath = getSharedCategoriesPath();
  const hasLocalFile = fs.existsSync(filePath);
  const localCats = hasLocalFile ? readLocalCategories() : null;

  const online = await isDatabaseAvailable();
  if (online) {
    try {
      await ensureSchema();
      const dbCats = await db.select().from(categories).orderBy(categories.displayOrder).execute();
      if (dbCats && dbCats.length > 0) {
        // Si ya existe el archivo local con coordenadas 2D '@', preservar esas coordenadas
        if (localCats && localCats.some((c) => c.gridSpan?.includes('@'))) {
          const localMap = new Map(localCats.map((c) => [c.id, c]));
          const merged = dbCats
            .map((dbCat) => {
              const loc = localMap.get(dbCat.id);
              return loc
                ? {
                    ...dbCat,
                    name: loc.name || dbCat.name,
                    slug: loc.slug || dbCat.slug,
                    imageUrl: loc.imageUrl ?? dbCat.imageUrl,
                    gridSpan: loc.gridSpan || dbCat.gridSpan,
                    displayOrder: loc.displayOrder ?? dbCat.displayOrder,
                  }
                : dbCat;
            })
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          return merged;
        }

        // Si las categorías de BD aún tienen el formato antiguo sin '@', usar coordenadas 2D iniciales
        if (!dbCats.some((c) => c.gridSpan?.includes('@'))) {
          const defaultMap = new Map(DEFAULT_INITIAL_CATEGORIES.map((c) => [c.id, c]));
          return dbCats.map((dbCat) => {
            const def = defaultMap.get(dbCat.id);
            return def ? { ...dbCat, gridSpan: def.gridSpan } : dbCat;
          });
        }

        return dbCats;
      }
    } catch (err) {
      markDatabaseOffline();
      console.warn('Fallback a archivo local de categorías:', err);
    }
  }

  return localCats || readLocalCategories();
}

/**
 * Obtiene todos los productos enriquecidos con su categoría y modificadores,
 * sincronizando cambios locales y PostgreSQL sin bloquear cuando la BD está apagada.
 */
export async function getStoredProducts(includeInactive = false): Promise<StoredProduct[]> {
  const cats = await getStoredCategories();
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const hasLocalProductsFile = fs.existsSync(getSharedProductsPath());
  const localProds = hasLocalProductsFile ? readLocalProducts() : null;

  const online = await isDatabaseAvailable();
  if (online) {
    try {
      await ensureSchema();
      const rawProds = await db.select().from(products).execute();

      if (rawProds && rawProds.length > 0) {
        const allMods = await db.select().from(productModifiers).execute();
        const allOpts = await db.select().from(modifierOptions).execute();

        const dbEnriched: StoredProduct[] = rawProds.map((p) => {
          const cat = p.categoryId ? catMap.get(p.categoryId) : undefined;
          const pMods = allMods
            .filter((m) => m.productId === p.id)
            .map((m) => ({
              id: m.id,
              name: m.name,
              type: (m.type as 'single' | 'multiple') || 'single',
              required: Boolean(m.required),
              options: allOpts
                .filter((o) => o.modifierId === m.id)
                .map((o) => ({
                  id: o.id,
                  name: o.name,
                  priceDelta: o.priceDelta,
                  isDefault: Boolean(o.isDefault),
                })),
            }));

          return {
            id: p.id,
            title: p.title,
            description: p.description,
            imageUrl: p.imageUrl,
            basePrice: p.basePrice,
            isActive: p.isActive,
            isFeatured: Boolean(p.isFeatured),
            categoryId: p.categoryId,
            categoryName: cat?.name || 'General',
            categorySlug: cat?.slug || null,
            modifiers: pMods,
          };
        });

        // Si existe archivo local editado desde el CMS, fusionar los cambios más recientes
        if (localProds && localProds.length > 0) {
          const mergedMap = new Map<string, StoredProduct>();
          for (const dbP of dbEnriched) {
            mergedMap.set(dbP.id, dbP);
          }
          for (const locP of localProds) {
            const cat = locP.categoryId ? catMap.get(locP.categoryId) : undefined;
            mergedMap.set(locP.id, {
              ...locP,
              categoryName: cat?.name || locP.categoryName || 'General',
              categorySlug: cat?.slug || locP.categorySlug || null,
            });
          }
          const mergedList = Array.from(mergedMap.values());
          return includeInactive ? mergedList : mergedList.filter((p) => p.isActive !== false);
        }

        return includeInactive ? dbEnriched : dbEnriched.filter((p) => p.isActive !== false);
      }
    } catch (err) {
      markDatabaseOffline();
      console.warn('Fallback a archivo local de productos:', err);
    }
  }

  const fallbackProds = localProds || readLocalProducts();
  const filtered = includeInactive
    ? fallbackProds
    : fallbackProds.filter((p) => p.isActive !== false);

  return filtered.map((p) => {
    const cat = p.categoryId ? catMap.get(p.categoryId) : undefined;
    return {
      ...p,
      categoryName: cat?.name || p.categoryName || 'General',
      categorySlug: cat?.slug || p.categorySlug || null,
    };
  });
}

export async function getStoredProductById(
  id: string,
  includeInactive = true
): Promise<StoredProduct | null> {
  const all = await getStoredProducts(includeInactive);
  return all.find((p) => p.id === id) || null;
}

/**
 * Obtiene las categorías junto con el conteo real de productos activos para el Storefront.
 */
export async function getStoredCategoriesWithCount(): Promise<StoredCategoryWithCount[]> {
  const [cats, allProducts] = await Promise.all([
    getStoredCategories(),
    getStoredProducts(),
  ]);

  return cats.map((cat) => ({
    ...cat,
    productCount: allProducts.filter((p) => p.categoryId === cat.id).length,
  }));
}

export async function saveStoredCategoriesLayout(
  updates: { id: string; gridSpan: string; displayOrder: number }[]
): Promise<void> {
  const currentLocal = readLocalCategories();
  const updatedLocal = currentLocal
    .map((cat) => {
      const match = updates.find((u) => u.id === cat.id);
      if (!match) return cat;
      return {
        ...cat,
        gridSpan: match.gridSpan,
        displayOrder: match.displayOrder,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);
  writeLocalCategories(updatedLocal);

  const online = await isDatabaseAvailable();
  if (online) {
    try {
      await ensureSchema();
      for (const item of updates) {
        await db
          .update(categories)
          .set({
            gridSpan: item.gridSpan,
            displayOrder: item.displayOrder,
          })
          .where(eq(categories.id, item.id));
      }
    } catch (err) {
      console.warn('Aviso sincronizando layout en PostgreSQL:', err);
    }
  }
}

export async function createStoredCategory(input: {
  name: string;
  slug: string;
  imageUrl: string | null;
  gridSpan: string;
}): Promise<Category> {
  const currentLocal = readLocalCategories();
  const maxOrder = currentLocal.reduce((max, c) => Math.max(max, c.displayOrder || 0), 0);
  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name: input.name.trim(),
    slug: input.slug.toLowerCase().trim().replace(/\s+/g, '-'),
    imageUrl: input.imageUrl?.trim() || null,
    gridSpan: input.gridSpan || '1x1',
    displayOrder: maxOrder + 1,
  };

  const online = await isDatabaseAvailable();
  if (online) {
    try {
      await ensureSchema();
      const [created] = await db
        .insert(categories)
        .values({
          name: newCat.name,
          slug: newCat.slug,
          imageUrl: newCat.imageUrl,
          gridSpan: newCat.gridSpan,
          displayOrder: newCat.displayOrder,
        })
        .returning();

      if (created) {
        writeLocalCategories([...currentLocal, created]);
        return created;
      }
    } catch (err) {
      console.warn('Aviso creando categoría en PostgreSQL, usando store local:', err);
    }
  }

  const nextLocal = [...currentLocal, newCat];
  writeLocalCategories(nextLocal);
  return newCat;
}

export async function updateStoredCategory(input: {
  id: string;
  name: string;
  slug?: string;
  imageUrl: string | null;
  gridSpan: string;
  displayOrder: number;
}): Promise<void> {
  const currentLocal = readLocalCategories();
  const nextLocal = currentLocal.map((cat) =>
    cat.id === input.id
      ? {
          ...cat,
          name: input.name.trim(),
          slug: input.slug ? input.slug.toLowerCase().trim().replace(/\s+/g, '-') : cat.slug,
          imageUrl: input.imageUrl?.trim() || null,
          gridSpan: input.gridSpan || cat.gridSpan,
          displayOrder: input.displayOrder ?? cat.displayOrder,
        }
      : cat
  );
  writeLocalCategories(nextLocal);

  const online = await isDatabaseAvailable();
  if (online) {
    try {
      await ensureSchema();
      await db
        .update(categories)
        .set({
          name: input.name.trim(),
          slug: input.slug ? input.slug.toLowerCase().trim().replace(/\s+/g, '-') : undefined,
          imageUrl: input.imageUrl?.trim() || null,
          gridSpan: input.gridSpan || '1x1',
          displayOrder: input.displayOrder,
        })
        .where(eq(categories.id, input.id));
    } catch (err) {
      console.warn('Aviso actualizando categoría en PostgreSQL:', err);
    }
  }
}

export async function deleteStoredCategory(id: string): Promise<void> {
  const currentLocal = readLocalCategories();
  writeLocalCategories(currentLocal.filter((c) => c.id !== id));

  const online = await isDatabaseAvailable();
  if (online) {
    try {
      await ensureSchema();
      await db.delete(categories).where(eq(categories.id, id));
    } catch (err) {
      console.warn('Aviso eliminando categoría en PostgreSQL:', err);
    }
  }
}

export async function createStoredProduct(input: {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  categoryId: string | null;
  isFeatured: boolean;
  isActive?: boolean;
  modifiers: StoredModifierGroup[];
}): Promise<StoredProduct> {
  const currentLocal = readLocalProducts();
  const newProd: StoredProduct = {
    id: input.id,
    title: input.title.trim(),
    description: input.description,
    imageUrl: input.imageUrl,
    basePrice: input.basePrice,
    isActive: input.isActive !== undefined ? input.isActive : true,
    isFeatured: input.isFeatured,
    categoryId: input.categoryId,
    modifiers: input.modifiers,
  };
  writeLocalProducts([newProd, ...currentLocal.filter((p) => p.id !== input.id)]);
  return newProd;
}

export async function updateStoredProduct(input: {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  categoryId: string | null;
  isFeatured: boolean;
  isActive?: boolean;
  modifiers: StoredModifierGroup[];
}): Promise<StoredProduct> {
  const currentLocal = readLocalProducts();
  const existsInLocal = currentLocal.some((p) => p.id === input.id);

  const updatedProd: StoredProduct = {
    id: input.id,
    title: input.title.trim(),
    description: input.description,
    imageUrl: input.imageUrl,
    basePrice: input.basePrice,
    isActive: input.isActive !== undefined ? input.isActive : true,
    isFeatured: input.isFeatured,
    categoryId: input.categoryId,
    modifiers: input.modifiers,
  };

  const nextLocal = existsInLocal
    ? currentLocal.map((p) => (p.id === input.id ? { ...p, ...updatedProd } : p))
    : [updatedProd, ...currentLocal];

  writeLocalProducts(nextLocal);
  return updatedProd;
}

export async function deleteStoredProduct(id: string): Promise<void> {
  const currentLocal = readLocalProducts();
  writeLocalProducts(currentLocal.filter((p) => p.id !== id));
}

export async function bulkUpsertStoredProducts(
  items: {
    id?: string;
    title: string;
    description: string;
    imageUrl: string;
    basePrice: number;
    categoryId: string | null;
    isFeatured: boolean;
    isActive?: boolean;
    modifiers?: StoredModifierGroup[];
  }[]
): Promise<{ importedCount: number; created: number; updated: number; total: number }> {
  const currentLocal = readLocalProducts();
  const localMap = new Map(currentLocal.map((p) => [p.id, p]));
  let count = 0;
  let created = 0;
  let updated = 0;

  const prepared: StoredProduct[] = [];

  for (const item of items) {
    if (!item.title?.trim()) continue;
    const id = item.id?.trim() || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const existing = localMap.get(id);
    if (existing) {
      updated++;
    } else {
      created++;
    }
    const prod: StoredProduct = {
      id,
      title: item.title.trim(),
      description: item.description ?? existing?.description ?? '',
      imageUrl: item.imageUrl || existing?.imageUrl || '',
      basePrice: Math.max(0, Math.round(item.basePrice)),
      isActive: item.isActive !== undefined ? item.isActive : (existing?.isActive ?? true),
      isFeatured: item.isFeatured !== undefined ? item.isFeatured : (existing?.isFeatured ?? false),
      categoryId: item.categoryId ?? existing?.categoryId ?? null,
      modifiers: item.modifiers ?? existing?.modifiers ?? [],
    };
    localMap.set(id, prod);
    prepared.push(prod);
    count++;
  }

  writeLocalProducts(Array.from(localMap.values()));

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      for (const prod of prepared) {
        const existingDb = await db
          .select()
          .from(products)
          .where(eq(products.id, prod.id))
          .limit(1)
          .execute();

        if (existingDb.length > 0) {
          await db
            .update(products)
            .set({
              title: prod.title,
              description: prod.description,
              imageUrl: prod.imageUrl,
              basePrice: prod.basePrice,
              isActive: prod.isActive,
              isFeatured: prod.isFeatured,
              categoryId: prod.categoryId,
            })
            .where(eq(products.id, prod.id));
        } else {
          await db.insert(products).values({
            id: prod.id,
            title: prod.title,
            description: prod.description,
            imageUrl: prod.imageUrl,
            basePrice: prod.basePrice,
            isActive: prod.isActive,
            isFeatured: prod.isFeatured,
            categoryId: prod.categoryId,
          });
        }
      }
    } catch (err) {
      markDatabaseOffline();
      console.warn('Aviso en carga masiva PostgreSQL (persistido en store local):', err);
    }
  }

  return {
    importedCount: count,
    created,
    updated,
    total: localMap.size,
  };
}

// ============================================================================
// Persistencia Híbrida de Apariencia, Logo SVG y Tipografías (site_settings)
// ============================================================================
export interface StoredSiteAppearance {
  id: string;
  siteName: string;
  logoSvg: string | null;
  logoColor: string;
  heroTitle: string;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  heroCtaText: string;
  heroCtaLink: string;
  headingFont: string;
  bodyFont: string;
}

const DEFAULT_APPEARANCE: StoredSiteAppearance = {
  id: 'default',
  siteName: 'LUNA ART STUDIO',
  logoSvg: null,
  logoColor: '#ec4899',
  heroTitle: 'Ilustración de Autor, Prints & Merch Exclusivo',
  heroSubtitle:
    'Láminas de arte fine art, stickers holográficos, pines esmaltados y papelería ilustrada para alegrar tu día a día.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&auto=format&fit=crop&q=80',
  heroCtaText: 'Explorar Tienda de Arte',
  heroCtaLink: '/catalogo',
  headingFont: 'Plus Jakarta Sans',
  bodyFont: 'Inter',
};

function getSiteSettingsPath(): string {
  return path.join(getCmsDataDir(), 'site-settings.json');
}

export async function getStoredSiteSettings(): Promise<StoredSiteAppearance> {
  const filePath = getSiteSettingsPath();
  let localData: Partial<StoredSiteAppearance> | null = null;
  try {
    if (fs.existsSync(filePath)) {
      localData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // ignore
  }

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      const rows = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.id, 'default'))
        .limit(1)
        .execute();
      if (rows && rows.length > 0) {
        const dbRow = rows[0];
        return {
          id: 'default',
          siteName: localData?.siteName || dbRow.siteName || DEFAULT_APPEARANCE.siteName,
          logoSvg: localData?.logoSvg !== undefined ? localData.logoSvg : dbRow.logoSvg,
          logoColor: localData?.logoColor || dbRow.logoColor || DEFAULT_APPEARANCE.logoColor,
          heroTitle: localData?.heroTitle || dbRow.heroTitle || DEFAULT_APPEARANCE.heroTitle,
          heroSubtitle:
            localData?.heroSubtitle !== undefined ? localData.heroSubtitle : dbRow.heroSubtitle,
          heroImageUrl:
            localData?.heroImageUrl !== undefined ? localData.heroImageUrl : dbRow.heroImageUrl,
          heroCtaText: localData?.heroCtaText || dbRow.heroCtaText || DEFAULT_APPEARANCE.heroCtaText,
          heroCtaLink: localData?.heroCtaLink || dbRow.heroCtaLink || DEFAULT_APPEARANCE.heroCtaLink,
          headingFont:
            localData?.headingFont || (dbRow as any).headingFont || DEFAULT_APPEARANCE.headingFont,
          bodyFont: localData?.bodyFont || (dbRow as any).bodyFont || DEFAULT_APPEARANCE.bodyFont,
        };
      }
    } catch {
      markDatabaseOffline();
    }
  }

  return {
    ...DEFAULT_APPEARANCE,
    ...(localData || {}),
  };
}

export async function saveStoredSiteSettings(
  input: Omit<StoredSiteAppearance, 'id'>
): Promise<StoredSiteAppearance> {
  const toSave: StoredSiteAppearance = {
    id: 'default',
    siteName: input.siteName.trim() || DEFAULT_APPEARANCE.siteName,
    logoSvg: input.logoSvg?.trim() || null,
    logoColor: input.logoColor.trim() || DEFAULT_APPEARANCE.logoColor,
    heroTitle: input.heroTitle.trim() || DEFAULT_APPEARANCE.heroTitle,
    heroSubtitle: input.heroSubtitle ?? '',
    heroImageUrl: input.heroImageUrl ?? '',
    heroCtaText: input.heroCtaText.trim() || DEFAULT_APPEARANCE.heroCtaText,
    heroCtaLink: input.heroCtaLink.trim() || DEFAULT_APPEARANCE.heroCtaLink,
    headingFont: input.headingFont?.trim() || DEFAULT_APPEARANCE.headingFont,
    bodyFont: input.bodyFont?.trim() || DEFAULT_APPEARANCE.bodyFont,
  };

  try {
    fs.writeFileSync(getSiteSettingsPath(), JSON.stringify(toSave, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error guardando site-settings.json local:', err);
  }

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      const existing = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.id, 'default'))
        .limit(1)
        .execute();

      if (existing.length > 0) {
        await db
          .update(siteSettings)
          .set({
            siteName: toSave.siteName,
            logoSvg: toSave.logoSvg,
            logoColor: toSave.logoColor,
            heroTitle: toSave.heroTitle,
            heroSubtitle: toSave.heroSubtitle || '',
            heroImageUrl: toSave.heroImageUrl || '',
            heroCtaText: toSave.heroCtaText,
            heroCtaLink: toSave.heroCtaLink,
            headingFont: toSave.headingFont,
            bodyFont: toSave.bodyFont,
            updatedAt: new Date(),
          })
          .where(eq(siteSettings.id, 'default'));
      } else {
        await db.insert(siteSettings).values({
          id: 'default',
          siteName: toSave.siteName,
          logoSvg: toSave.logoSvg,
          logoColor: toSave.logoColor,
          heroTitle: toSave.heroTitle,
          heroSubtitle: toSave.heroSubtitle || '',
          heroImageUrl: toSave.heroImageUrl || '',
          heroCtaText: toSave.heroCtaText,
          heroCtaLink: toSave.heroCtaLink,
          headingFont: toSave.headingFont,
          bodyFont: toSave.bodyFont,
          updatedAt: new Date(),
        });
      }
    } catch {
      markDatabaseOffline();
    }
  }

  return toSave;
}

// ============================================================================
// Persistencia Híbrida de Órdenes (PostgreSQL + .cms-data/orders-store.json)
// ============================================================================
function getOrdersStorePath(): string {
  return path.join(getCmsDataDir(), 'orders-store.json');
}

function readLocalOrders(): Order[] {
  const filePath = getOrdersStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalOrders(items: Order[]): void {
  try {
    fs.writeFileSync(getOrdersStorePath(), JSON.stringify(items, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

export async function getStoredOrders(): Promise<Order[]> {
  const localOrders = readLocalOrders();

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      const dbOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).execute();
      if (dbOrders && dbOrders.length > 0) {
        const mergedMap = new Map<string, Order>();
        for (const o of dbOrders) mergedMap.set(o.id, o);
        for (const loc of localOrders) {
          if (!mergedMap.has(loc.id)) mergedMap.set(loc.id, loc);
        }
        return Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch {
      markDatabaseOffline();
    }
  }

  return localOrders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveStoredOrder(orderData: Partial<Order> & { id: string; total: number }): Promise<void> {
  const now = new Date();
  const fullOrder: Order = {
    id: orderData.id,
    userId: orderData.userId ?? null,
    status: orderData.status || 'pending',
    subtotal: orderData.subtotal ?? orderData.total,
    discountCode: orderData.discountCode ?? null,
    discountAmount: orderData.discountAmount ?? 0,
    total: orderData.total,
    customerEmail: orderData.customerEmail ?? null,
    itemsSummary: orderData.itemsSummary ?? null,
    itemsJson: orderData.itemsJson ?? null,
    customerName: orderData.customerName ?? null,
    customerPhone: orderData.customerPhone ?? null,
    shippingStreet: orderData.shippingStreet ?? null,
    shippingExtNumber: orderData.shippingExtNumber ?? null,
    shippingIntNumber: orderData.shippingIntNumber ?? null,
    shippingNeighborhood: orderData.shippingNeighborhood ?? null,
    shippingMunicipality: orderData.shippingMunicipality ?? null,
    shippingCity: orderData.shippingCity ?? null,
    shippingState: orderData.shippingState ?? null,
    shippingZip: orderData.shippingZip ?? null,
    shippingReferences: orderData.shippingReferences ?? null,
    shippingLat: orderData.shippingLat ?? null,
    shippingLng: orderData.shippingLng ?? null,
    locationSource: orderData.locationSource ?? 'zip',
    mpPreferenceId: orderData.mpPreferenceId ?? null,
    mpPaymentId: orderData.mpPaymentId ?? null,
    createdAt: orderData.createdAt ? new Date(orderData.createdAt) : now,
  };

  const currentLocal = readLocalOrders();
  writeLocalOrders([fullOrder, ...currentLocal.filter((o) => o.id !== fullOrder.id)]);

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      await db.insert(orders).values(fullOrder);
    } catch {
      markDatabaseOffline();
    }
  }
}

export async function updateStoredOrderStatus(
  orderId: string,
  status: 'pending' | 'paid' | 'shipped' | 'cancelled'
): Promise<void> {
  const currentLocal = readLocalOrders();
  const nextLocal = currentLocal.map((o) =>
    o.id === orderId ? { ...o, status } : o
  );
  writeLocalOrders(nextLocal);

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      await db.update(orders).set({ status }).where(eq(orders.id, orderId));
    } catch {
      markDatabaseOffline();
    }
  }
}

