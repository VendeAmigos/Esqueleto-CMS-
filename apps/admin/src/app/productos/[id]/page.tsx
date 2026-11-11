import { getStoredProductById, getStoredCategories } from "@esqueleto/core";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const [product, allCategories] = await Promise.all([
    getStoredProductById(resolvedParams.id),
    getStoredCategories(),
  ]);

  if (!product) {
    notFound();
  }

  const initialData = {
    id: product.id,
    title: product.title,
    description: product.description,
    imageUrl: product.imageUrl,
    basePrice: product.basePrice,
    categoryId: product.categoryId,
    isFeatured: Boolean(product.isFeatured),
    isActive: product.isActive !== false,
    modifiers: product.modifiers || [],
  };

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono text-gray-400">ID: {product.id}</span>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Editar Producto: {product.title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Modifica el nombre, descripción, imagen, precio base, estado activo y modificadores asociados.
          </p>
        </div>
        <Link
          href="/productos"
          className="text-sm font-semibold text-gray-700 hover:text-black bg-white border border-gray-300 px-4 py-2 rounded-xl shadow-2xs"
        >
          &larr; Volver al Catálogo
        </Link>
      </div>

      <ProductForm
        categories={allCategories}
        initialData={initialData}
        isEdit={true}
      />
    </main>
  );
}
