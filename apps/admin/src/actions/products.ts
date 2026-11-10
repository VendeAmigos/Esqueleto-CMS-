"use server";

import {
  db,
  products,
  productModifiers,
  modifierOptions,
  isDatabaseAvailable,
  ensureSchema,
  eq,
  createStoredProduct,
  updateStoredProduct,
  deleteStoredProduct,
  type StoredModifierGroup,
} from "@esqueleto/core";
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

  const parsedModifiers: StoredModifierGroup[] = [];
  if (modifiersRaw) {
    try {
      const rawMods: ModifierGroupInput[] = JSON.parse(modifiersRaw);
      for (const mod of rawMods) {
        if (!mod.name.trim()) continue;
        parsedModifiers.push({
          id: crypto.randomUUID(),
          name: mod.name.trim(),
          type: mod.type || 'single',
          required: Boolean(mod.required),
          options: (mod.options || [])
            .filter((o) => o.name.trim())
            .map((o) => ({
              id: crypto.randomUUID(),
              name: o.name.trim(),
              priceDelta: Math.round(Number(o.priceDelta) || 0),
              isDefault: Boolean(o.isDefault),
            })),
        });
      }
    } catch (e) {
      console.error("Error parseando modificadores:", e);
    }
  }

  await createStoredProduct({
    id: productId,
    title: name,
    description,
    imageUrl: image,
    basePrice: priceInCents,
    categoryId: category || null,
    isFeatured,
    modifiers: parsedModifiers,
  });

  if (await isDatabaseAvailable()) {
    try {
      await ensureSchema();
      await db.insert(products).values({
        id: productId,
        title: name,
        description,
        imageUrl: image,
        basePrice: priceInCents,
        categoryId: category || null,
        isFeatured,
      });

      for (const mod of parsedModifiers) {
        await db.insert(productModifiers).values({
          id: mod.id,
          productId,
          name: mod.name,
          type: mod.type,
          required: mod.required,
        });
        for (const opt of mod.options) {
          await db.insert(modifierOptions).values({
            id: opt.id,
            modifierId: mod.id,
            name: opt.name,
            priceDelta: opt.priceDelta,
            isDefault: opt.isDefault,
          });
        }
      }
    } catch (e) {
      console.warn("Aviso guardando producto en PostgreSQL:", e);
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
  const parsedModifiers: StoredModifierGroup[] = [];

  if (modifiersRaw !== undefined) {
    try {
      const rawMods: ModifierGroupInput[] = JSON.parse(modifiersRaw || "[]");
      for (const mod of rawMods) {
        if (!mod.name.trim()) continue;
        parsedModifiers.push({
          id: crypto.randomUUID(),
          name: mod.name.trim(),
          type: mod.type || 'single',
          required: Boolean(mod.required),
          options: (mod.options || [])
            .filter((o) => o.name.trim())
            .map((o) => ({
              id: crypto.randomUUID(),
              name: o.name.trim(),
              priceDelta: Math.round(Number(o.priceDelta) || 0),
              isDefault: Boolean(o.isDefault),
            })),
        });
      }
    } catch (e) {
      console.error("Error parseando modificadores:", e);
    }
  }

  await updateStoredProduct({
    id,
    title: name,
    description,
    imageUrl: image,
    basePrice: priceInCents,
    categoryId: category || null,
    isFeatured,
    modifiers: parsedModifiers,
  });

  if (await isDatabaseAvailable()) {
    try {
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

      await db.delete(productModifiers).where(eq(productModifiers.productId, id));
      for (const mod of parsedModifiers) {
        await db.insert(productModifiers).values({
          id: mod.id,
          productId: id,
          name: mod.name,
          type: mod.type,
          required: mod.required,
        });
        for (const opt of mod.options) {
          await db.insert(modifierOptions).values({
            id: opt.id,
            modifierId: mod.id,
            name: opt.name,
            priceDelta: opt.priceDelta,
            isDefault: opt.isDefault,
          });
        }
      }
    } catch (e) {
      console.warn("Aviso actualizando producto en PostgreSQL:", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/productos");
  redirect("/productos");
}

export async function deleteProduct(id: string) {
  try {
    await deleteStoredProduct(id);
    if (await isDatabaseAvailable()) {
      await db.delete(products).where(eq(products.id, id));
    }
    revalidatePath("/");
    revalidatePath("/productos");
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { error: "No se pudo eliminar el producto" };
  }
}
