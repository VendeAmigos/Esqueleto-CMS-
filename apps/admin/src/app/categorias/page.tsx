import { db, categories, ensureSchema } from '@esqueleto/core';
import CategoryGridManager from './CategoryGridManager';

export const dynamic = 'force-dynamic';

export default async function CategoriasPage() {
  await ensureSchema();

  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(categories.displayOrder)
    .execute();

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      <div className="border-b border-gray-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            Organización del Catálogo
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">
            Categorías y Layout en Grid
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Define la distribución visual de tus categorías en la tienda (Bento Grid), cambia sus imágenes y ajusta qué tamaño ocupa cada una de manera intuitiva.
          </p>
        </div>
      </div>

      <CategoryGridManager categories={allCategories} />
    </main>
  );
}
