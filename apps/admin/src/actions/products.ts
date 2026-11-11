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
  bulkUpsertStoredProducts,
  getStoredCategories,
  type StoredModifierGroup,
} from "@esqueleto/core";
import { revalidatePath } from "next/cache";
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
  type: "single" | "multiple";
  required: boolean;
  options: ModifierOptionInput[];
}

export interface BulkProductRowInput {
  id?: string;
  title: string;
  description?: string;
  priceMxn: number;
  categoryNameOrSlug?: string;
  imageUrl?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

function parseModifiersFromRaw(modifiersRaw?: string): StoredModifierGroup[] {
  const parsedModifiers: StoredModifierGroup[] = [];
  if (!modifiersRaw) return parsedModifiers;
  try {
    const rawMods: ModifierGroupInput[] = JSON.parse(modifiersRaw);
    for (const mod of rawMods) {
      if (!mod.name || !mod.name.trim()) continue;
      parsedModifiers.push({
        id: mod.id || crypto.randomUUID(),
        name: mod.name.trim(),
        type: mod.type === "multiple" ? "multiple" : "single",
        required: Boolean(mod.required),
        options: (mod.options || [])
          .filter((o) => o.name && o.name.trim())
          .map((o) => ({
            id: o.id || crypto.randomUUID(),
            name: o.name.trim(),
            priceDelta: Math.round(Number(o.priceDelta) || 0),
            isDefault: Boolean(o.isDefault),
          })),
      });
    }
  } catch (e) {
    console.error("Error parseando modificadores:", e);
  }
  return parsedModifiers;
}

async function syncProductToPostgres(params: {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  categoryId: string | null;
  isFeatured: boolean;
  isActive: boolean;
  modifiers: StoredModifierGroup[];
}) {
  if (!(await isDatabaseAvailable())) return;

  try {
    await ensureSchema();
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, params.id));

    if (existing.length > 0) {
      await db
        .update(products)
        .set({
          title: params.title,
          description: params.description,
          imageUrl: params.imageUrl,
          basePrice: params.basePrice,
          categoryId: params.categoryId || null,
          isFeatured: params.isFeatured,
          isActive: params.isActive,
        })
        .where(eq(products.id, params.id));
    } else {
      await db.insert(products).values({
        id: params.id,
        title: params.title,
        description: params.description,
        imageUrl: params.imageUrl,
        basePrice: params.basePrice,
        categoryId: params.categoryId || null,
        isFeatured: params.isFeatured,
        isActive: params.isActive,
      });
    }

    await db.delete(productModifiers).where(eq(productModifiers.productId, params.id));
    for (const mod of params.modifiers) {
      await db.insert(productModifiers).values({
        id: mod.id,
        productId: params.id,
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
    console.warn("Aviso sincronizando producto en PostgreSQL:", e);
  }
}

export async function createProduct(formData: FormData) {
  const name = formData.get("name")?.toString()?.trim();
  const description = formData.get("description")?.toString() || "";
  const price = formData.get("price")?.toString();
  const category = formData.get("category")?.toString() || null;
  const image = formData.get("image")?.toString() || "";
  const isFeatured = formData.get("isFeatured") === "true";
  const isActive = formData.get("isActive") !== "false";
  const modifiersRaw = formData.get("modifiers")?.toString();

  if (!name || price === undefined || price === "") {
    return { success: false, error: "El nombre y precio son obligatorios." };
  }

  const priceInCents = Math.round(Number(price) * 100);
  const productId = crypto.randomUUID();
  const parsedModifiers = parseModifiersFromRaw(modifiersRaw);

  await createStoredProduct({
    id: productId,
    title: name,
    description,
    imageUrl: image,
    basePrice: priceInCents,
    categoryId: category || null,
    isFeatured,
    isActive,
    modifiers: parsedModifiers,
  });

  await syncProductToPostgres({
    id: productId,
    title: name,
    description,
    imageUrl: image,
    basePrice: priceInCents,
    categoryId: category || null,
    isFeatured,
    isActive,
    modifiers: parsedModifiers,
  });

  revalidatePath("/");
  revalidatePath("/productos");
  return { success: true, id: productId };
}

export async function updateProduct(id: string, formData: FormData) {
  const name = formData.get("name")?.toString()?.trim();
  const description = formData.get("description")?.toString() || "";
  const price = formData.get("price")?.toString();
  const category = formData.get("category")?.toString() || null;
  const image = formData.get("image")?.toString() || "";
  const isFeatured = formData.get("isFeatured") === "true";
  const isActive = formData.get("isActive") !== "false";
  const modifiersRaw = formData.get("modifiers")?.toString();

  if (!name || price === undefined || price === "") {
    return { success: false, error: "El nombre y precio son obligatorios." };
  }

  const priceInCents = Math.round(Number(price) * 100);
  const parsedModifiers = parseModifiersFromRaw(modifiersRaw);

  await updateStoredProduct({
    id,
    title: name,
    description,
    imageUrl: image,
    basePrice: priceInCents,
    categoryId: category || null,
    isFeatured,
    isActive,
    modifiers: parsedModifiers,
  });

  await syncProductToPostgres({
    id,
    title: name,
    description,
    imageUrl: image,
    basePrice: priceInCents,
    categoryId: category || null,
    isFeatured,
    isActive,
    modifiers: parsedModifiers,
  });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath(`/productos/${id}`);
  return { success: true, id };
}

export async function bulkImportProductsAction(rows: BulkProductRowInput[]) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: "No se recibieron productos para importar." };
  }

  const allCategories = await getStoredCategories();
  const prepared = rows
    .filter((r) => r.title && String(r.title).trim().length > 0)
    .map((r) => {
      const catRaw = (r.categoryNameOrSlug || "").trim().toLowerCase();
      const matchedCat = allCategories.find(
        (c) =>
          c.id.toLowerCase() === catRaw ||
          c.name.toLowerCase() === catRaw ||
          c.slug.toLowerCase() === catRaw
      );

      const basePrice = Math.max(0, Math.round((Number(r.priceMxn) || 0) * 100));
      return {
        id: r.id?.trim() || undefined,
        title: r.title.trim(),
        description: r.description?.trim() || "",
        imageUrl: r.imageUrl?.trim() || "",
        basePrice,
        categoryId: matchedCat ? matchedCat.id : null,
        isFeatured: Boolean(r.isFeatured),
        isActive: r.isActive !== false,
      };
    });

  const stats = await bulkUpsertStoredProducts(prepared);

  if (await isDatabaseAvailable()) {
    for (const item of prepared) {
      if (!item.id) continue;
      await syncProductToPostgres({
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        basePrice: item.basePrice,
        categoryId: item.categoryId,
        isFeatured: item.isFeatured,
        isActive: item.isActive,
        modifiers: [],
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/productos");
  return {
    success: true,
    created: stats.created,
    updated: stats.updated,
    total: stats.total,
  };
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
