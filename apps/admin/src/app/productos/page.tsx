import { db, products, categories, productModifiers, eq } from '@esqueleto/core';
import { deleteProduct } from '../../actions/products';
import Link from 'next/link';

export default async function ProductosPage() {
  const allProducts = await db
    .select({
      id: products.id,
      title: products.title,
      description: products.description,
      imageUrl: products.imageUrl,
      price: products.basePrice,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .execute();

  // Obtener conteo de modificadores para cada producto
  const modifiersList = await db.select().from(productModifiers);

  const productsWithMods = allProducts.map((p) => {
    const mods = modifiersList.filter((m) => m.productId === p.id);
    return {
      ...p,
      modifiersCount: mods.length,
      modifiersNames: mods.map((m) => m.name),
    };
  });

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Productos
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Gestiona el catálogo de productos, imágenes y modificadores de precio de tu tienda.
          </p>
        </div>
        <Link
          href="/productos/nuevo"
          className="bg-black text-white px-5 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Producto
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {productsWithMods.length === 0 ? (
          <div className="text-center p-12 border-dashed border-gray-300">
            <p className="text-gray-500">No hay productos registrados en la base de datos.</p>
            <div className="mt-4">
              <Link
                href="/productos/nuevo"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Crear el primer producto &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Precio Base
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Modificadores
                </th>
                <th scope="col" className="relative px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {productsWithMods.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">{product.title}</div>
                        {product.description && (
                          <div className="text-xs text-gray-400 max-w-xs truncate">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                      {product.categoryName || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${(product.price / 100).toFixed(2)} MXN
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.modifiersCount > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 w-fit">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                          {product.modifiersCount} {product.modifiersCount === 1 ? 'grupo' : 'grupos'}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate max-w-[200px]" title={product.modifiersNames.join(', ')}>
                          {product.modifiersNames.join(', ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sin modificadores</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/productos/${product.id}`}
                        className="text-gray-700 hover:text-black p-2 hover:bg-gray-100 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Editar Producto y Modificadores"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </Link>

                      <form
                        action={async () => {
                          'use server';
                          await deleteProduct(product.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar Producto"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
