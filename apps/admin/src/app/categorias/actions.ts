'use server';

import { db, categories, eq, ensureSchema } from '@esqueleto/core';
import { revalidatePath } from 'next/cache';

export async function createCategory(formData: FormData) {
  await ensureSchema();

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const imageUrl = formData.get('imageUrl') as string || null;
  const gridSpan = (formData.get('gridSpan') as string) || 'col-1';

  if (!name || !slug) return { success: false, error: 'Nombre y Slug requeridos' };

  try {
    // Calcular el orden máximo actual para ponerla al final
    const currentCats = await db.select().from(categories).execute();
    const maxOrder = currentCats.reduce((max, c) => Math.max(max, c.displayOrder || 0), 0);

    await db.insert(categories).values({
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      imageUrl: imageUrl?.trim() || null,
      gridSpan,
      displayOrder: maxOrder + 1,
    });

    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating category:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCategory(formData: FormData) {
  await ensureSchema();

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const imageUrl = formData.get('imageUrl') as string;
  const gridSpan = formData.get('gridSpan') as string;
  const displayOrder = parseInt(formData.get('displayOrder') as string || '0', 10);

  if (!id || !name) return { success: false, error: 'ID y Nombre requeridos' };

  try {
    await db
      .update(categories)
      .set({
        name,
        slug: slug ? slug.toLowerCase().replace(/\s+/g, '-') : undefined,
        imageUrl: imageUrl?.trim() || null,
        gridSpan: gridSpan || 'col-1',
        displayOrder,
      })
      .where(eq(categories.id, id));

    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating category:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCategoryGrid(id: string, gridSpan: string) {
  await ensureSchema();

  try {
    await db
      .update(categories)
      .set({ gridSpan })
      .where(eq(categories.id, id));

    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating category grid:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCategoryOrder(id: string, direction: 'up' | 'down') {
  await ensureSchema();

  try {
    const all = await db.select().from(categories).orderBy(categories.displayOrder).execute();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) return { success: false };

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= all.length) return { success: true };

    const currentCat = all[index];
    const targetCat = all[targetIndex];

    const currentOrder = currentCat.displayOrder;
    const targetOrder = targetCat.displayOrder;

    await db.update(categories).set({ displayOrder: targetOrder }).where(eq(categories.id, currentCat.id));
    await db.update(categories).set({ displayOrder: currentOrder }).where(eq(categories.id, targetCat.id));

    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error ordering categories:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCategory(id: string) {
  try {
    await db.delete(categories).where(eq(categories.id, id));
    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false };
  }
}
