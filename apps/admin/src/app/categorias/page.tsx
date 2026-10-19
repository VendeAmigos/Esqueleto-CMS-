import { db, categories } from '@esqueleto/core';
import { createCategory, deleteCategory } from './actions';

export default async function CategoriasPage() {
  const allCategories = await db.select().from(categories).execute();

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Categorías
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Administra las categorías de tu tienda para organizar tus productos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Categorías */}
        <div className="lg:col-span-2 space-y-4">
          {allCategories.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-300">
              <p className="text-gray-500">No hay categorías registradas.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {allCategories.map((cat) => (
                <li key={cat.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{cat.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono">{cat.slug}</p>
                  </div>
                  <form action={async () => {
                    'use server';
                    await deleteCategory(cat.id);
                  }}>
                    <button 
                      type="submit" 
                      className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar Categoría"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulario de Nueva Categoría */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-4">
              Nueva Categoría
            </h2>
            <form action={createCategory} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
                <input 
                  type="text" 
                  name="name" 
                  id="name" 
                  required
                  placeholder="Ej. Ropa de Invierno"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm p-2 border"
                />
              </div>
              
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700">Slug (URL)</label>
                <input 
                  type="text" 
                  name="slug" 
                  id="slug" 
                  required
                  placeholder="ej. ropa-de-invierno"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm p-2 border font-mono text-gray-600"
                />
                <p className="text-xs text-gray-400 mt-1">Identificador único en minúsculas sin espacios.</p>
              </div>

              <button 
                type="submit" 
                className="w-full mt-2 flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none transition-colors"
              >
                Crear Categoría
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
