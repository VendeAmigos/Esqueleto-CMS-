"use server";

import { db, products, productModifiers, modifierOptions, ensureSchema } from "@esqueleto/core";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";

interface ModifierOptionInput {
  id?: string;
  name: string;
  priceDelta: number; // En centavos
  isDefault?: boolean;
}

interface ModifierGroupInput {
  id?: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: ModifierOptionInput[];
}

export async function createProduct(formData: FormData) {
  await ensureSchema();
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString() || "";
  const price = formData.get("price")?.toString();
  const category = formData.get("category")?.toString() || null;
  const image = formData.get("image")?.toString() || "";
  const isFeatured = formData.get("isFeatured") === "true";
  const modifiersRaw = formData.get("modifiers")?.toString();

  if (!name || !price) {
    throw new Error("El nombre y precio son obligatorios.");
  }

  const priceInCents = Math.round(Number(price) * 100);
  const productId = crypto.randomUUID();

  await db.insert(products).values({
    id: productId,
    title: name,
    description,
    imageUrl: image,
    basePrice: priceInCents,
    categoryId: category || null,
    isFeatured,
  });

  if (modifiersRaw) {
    try {
      const modifiers: ModifierGroupInput[] = JSON.parse(modifiersRaw);
      for (const mod of modifiers) {
        if (!mod.name.trim()) continue;
        const modifierId = crypto.randomUUID();
        await db.insert(productModifiers).values({
          id: modifierId,
          productId,
          name: mod.name.trim(),
          type: mod.type || 'single',
          required: Boolean(mod.required),
        });

        for (const opt of mod.options || []) {
          if (!opt.name.trim()) continue;
          await db.insert(modifierOptions).values({
            id: crypto.randomUUID(),
            modifierId,
            name: opt.name.trim(),
            priceDelta: Math.round(Number(opt.priceDelta) || 0),
            isDefault: Boolean(opt.isDefault),
          });
        }
      }
    } catch (e) {
      console.error("Error al registrar modificadores:", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/productos");
  redirect("/productos");
}

export async function updateProduct(id: string, formData: FormData) {
  const name = formData.get("name")?.toString();
  const description = formData.get("description")?.toString() || "";
  const price = formData.get("price")?.toString();
  const category = formData.get("category")?.toString() || null;
  const image = formData.get("image")?.toString() || "";
  const isFeatured = formData.get("isFeatured") === "true";
  const modifiersRaw = formData.get("modifiers")?.toString();

  if (!name || !price) {
    throw new Error("El nombre y precio son obligatorios.");
  }

  const priceInCents = Math.round(Number(price) * 100);

  await db
    .update(products)
    .set({
      title: name,
      description,
      imageUrl: image,
      basePrice: priceInCents,
      categoryId: category || null,
      isFeatured,
    })
    .where(eq(products.id, id));

  if (modifiersRaw !== undefined) {
    try {
      // Al eliminar el modificador se eliminan sus opciones por onDelete: cascade
      await db.delete(productModifiers).where(eq(productModifiers.productId, id));

      const modifiers: ModifierGroupInput[] = JSON.parse(modifiersRaw);
      for (const mod of modifiers) {
        if (!mod.name.trim()) continue;
        const modifierId = crypto.randomUUID();
        await db.insert(productModifiers).values({
          id: modifierId,
          productId: id,
          name: mod.name.trim(),
          type: mod.type || 'single',
          required: Boolean(mod.required),
        });

        for (const opt of mod.options || []) {
          if (!opt.name.trim()) continue;
          await db.insert(modifierOptions).values({
            id: crypto.randomUUID(),
            modifierId,
            name: opt.name.trim(),
            priceDelta: Math.round(Number(opt.priceDelta) || 0),
            isDefault: Boolean(opt.isDefault),
          });
        }
      }
    } catch (e) {
      console.error("Error actualizando modificadores:", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/productos");
  redirect("/productos");
}

export async function deleteProduct(id: string) {
  try {
    await db.delete(products).where(eq(products.id, id));
    revalidatePath("/");
    revalidatePath("/productos");
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { error: "No se pudo eliminar el producto" };
  }
}
