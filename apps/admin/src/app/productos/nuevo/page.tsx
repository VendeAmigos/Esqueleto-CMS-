import { db, categories } from "@esqueleto/core";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";

export default async function NuevoProductoPage() {
  const allCategories = await db.select().from(categories).execute();

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex items-center justify-between">
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
    </main>
  );
}
