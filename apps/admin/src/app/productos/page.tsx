import { getStoredProducts } from "@esqueleto/core";
import { deleteProduct } from "../../actions/products";
import Link from "next/link";
import ProductsToolbar from "./ProductsToolbar";
import ProductActiveSwitch from "./ProductActiveSwitch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductosPage() {
  const allProducts = await getStoredProducts(true);

  const productsWithMods = allProducts.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.basePrice,
    isFeatured: Boolean(p.isFeatured),
    isActive: p.isActive !== false,
    categoryName: p.categoryName || "General",
    modifiersCount: p.modifiers?.length || 0,
    modifiersNames: (p.modifiers || []).map((m) => m.name),
  }));

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-6 sm:mb-8 flex flex-wrap justify-between items-end gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Productos ({productsWithMods.length})
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Edita productos individuales, activa o pausa su visibilidad con el switch y realiza cargas masivas con Excel / CSV / JSON.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ProductsToolbar existingProducts={productsWithMods} />

          <Link
            href="/productos/nuevo"
            className="bg-black text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2 text-xs"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nuevo Producto
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {productsWithMods.length === 0 ? (
          <div className="text-center p-12 border-dashed border-gray-300">
            <p className="text-gray-500">No hay productos registrados.</p>
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
          <>
            {/* Vista en tarjetas responsivas para móvil y tablets (< 1024px) */}
            <div className="divide-y divide-gray-100 lg:hidden">
              {productsWithMods.map((product) => (
                <div key={product.id} className="p-4 space-y-3 hover:bg-gray-50/70 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/productos/${product.id}`}
                          className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2"
                        >
                          {product.title}
                        </Link>
                        {product.isFeatured && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden="true"
                              className="h-2.5 w-2.5 text-amber-700"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                            Destacado
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium border border-gray-200">
                          {product.categoryName || "General"}
                        </span>
                        <span className="font-bold text-gray-900">
                          ${(product.price / 100).toFixed(2)} MXN
                        </span>
                      </div>
                      {product.modifiersCount > 0 && (
                        <p className="text-[11px] text-indigo-700 font-medium">
                          {product.modifiersCount}{" "}
                          {product.modifiersCount === 1 ? "grupo" : "grupos"} (
                          {product.modifiersNames.join(", ")})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                    <ProductActiveSwitch
                      productId={product.id}
                      productTitle={product.title}
                      initialActive={product.isActive}
                    />
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/productos/${product.id}`}
                        className="text-gray-800 hover:text-black px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs font-bold inline-flex items-center gap-1"
                      >
                        Editar
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deleteProduct(product.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-red-600 hover:text-red-900 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors text-xs font-semibold"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla fija de 4 columnas para desktop (>= 1024px) sin recorte horizontal */}
            <div className="hidden lg:block w-full">
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      Producto
                    </th>
                    <th
                      scope="col"
                      className="w-[120px] xl:w-[136px] px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      Precio
                    </th>
                    <th
                      scope="col"
                      className="w-[132px] xl:w-[146px] px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="w-[130px] xl:w-[144px] px-3 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {productsWithMods.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-hidden="true"
                                  className="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                href={`/productos/${product.id}`}
                                className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2 break-words"
                              >
                                {product.title}
                              </Link>
                              {product.isFeatured && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                    className="h-2.5 w-2.5 text-amber-700"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                  </svg>
                                  Destacado
                                </span>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                                {product.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className="px-2 py-0.5 inline-flex text-[11px] leading-4 font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200 max-w-full truncate">
                                {product.categoryName || "General"}
                              </span>
                              {product.modifiersCount > 0 ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] leading-4 font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 max-w-full truncate"
                                  title={product.modifiersNames.join(", ")}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                                  <span className="truncate">
                                    {product.modifiersCount}{" "}
                                    {product.modifiersCount === 1 ? "modificador" : "modificadores"}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">
                                  Sin modificadores
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-middle whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${(product.price / 100).toFixed(2)} MXN
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <ProductActiveSwitch
                          productId={product.id}
                          productTitle={product.title}
                          initialActive={product.isActive}
                        />
                      </td>
                      <td className="px-3 py-3.5 align-middle whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/productos/${product.id}`}
                            className="text-gray-800 hover:text-black px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs font-bold inline-flex items-center gap-1 shrink-0"
                            title="Editar Producto y Modificadores"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Editar
                          </Link>

                          <form
                            action={async () => {
                              "use server";
                              await deleteProduct(product.id);
                            }}
                          >
                            <button
                              type="submit"
                              aria-label={`Eliminar ${product.title}`}
                              className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Eliminar Producto"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
