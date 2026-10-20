import { db, products, categories, productModifiers, modifierOptions, eq } from "@esqueleto/core";
import ProductForm from "@/components/ProductForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditarProductoPage({
  params,
}: {
  params: { id: string };
}) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, params.id))
    .limit(1);

  if (!product) {
    notFound();
  }

  const allCategories = await db.select().from(categories).execute();

  // Obtener modificadores asociados
  const modifiers = await db
    .select()
    .from(productModifiers)
    .where(eq(productModifiers.productId, product.id));

  // Obtener opciones de cada modificador
  const modifiersWithOpts = await Promise.all(
    modifiers.map(async (mod) => {
      const opts = await db
        .select()
        .from(modifierOptions)
        .where(eq(modifierOptions.modifierId, mod.id));

      return {
        id: mod.id,
        name: mod.name,
        type: mod.type as 'single' | 'multiple',
        required: mod.required,
        options: opts.map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: o.priceDelta,
          isDefault: o.isDefault,
        })),
      };
    })
  );

  const initialData = {
    id: product.id,
    title: product.title,
    description: product.description,
    imageUrl: product.imageUrl,
    basePrice: product.basePrice,
    categoryId: product.categoryId,
    isFeatured: Boolean(product.isFeatured),
    modifiers: modifiersWithOpts,
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
