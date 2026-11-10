import { getStoredProductById, getStoredCategories } from "@esqueleto/core";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function EditarProductoPage({
  params,
}: {
  params: { id: string };
}) {
  const [product, allCategories] = await Promise.all([
    getStoredProductById(params.id),
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
    modifiers: product.modifiers || [],
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Editar Producto
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Modifica los detalles, imagen, precio y los modificadores asociados.
          </p>
        </div>
        <Link
          href="/productos"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          &larr; Volver a Productos
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
