import { getStoredCategories } from "@esqueleto/core";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function NuevoProductoPage() {
  const allCategories = await getStoredCategories();

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Nuevo Producto
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Crea un nuevo producto con imagen, precio base y grupos de modificadores configurables.
          </p>
        </div>
        <Link
          href="/productos"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          &larr; Volver a Productos
        </Link>
      </div>

      <ProductForm categories={allCategories} />
    </div>
  );
}
