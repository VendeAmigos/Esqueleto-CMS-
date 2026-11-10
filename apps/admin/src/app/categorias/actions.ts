'use server';

import {
  getStoredCategories,
  createStoredCategory,
  updateStoredCategory,
  saveStoredCategoriesLayout,
  deleteStoredCategory,
} from '@esqueleto/core';
import { revalidatePath } from 'next/cache';

export async function createCategory(formData: FormData) {
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const imageUrl = (formData.get('imageUrl') as string) || null;
  const gridSpan = (formData.get('gridSpan') as string) || '1x1';

  if (!name || !slug) return { success: false, error: 'Nombre y Slug requeridos' };

  try {
    const created = await createStoredCategory({
      name,
      slug,
      imageUrl,
      gridSpan,
    });

    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true, category: created };
  } catch (error: any) {
    console.error('Error creating category:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCategory(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const imageUrl = formData.get('imageUrl') as string;
  const gridSpan = formData.get('gridSpan') as string;
  const displayOrder = parseInt((formData.get('displayOrder') as string) || '0', 10);

  if (!id || !name) return { success: false, error: 'ID y Nombre requeridos' };

  try {
    await updateStoredCategory({
      id,
      name,
      slug,
      imageUrl: imageUrl?.trim() || null,
      gridSpan: gridSpan || '1x1',
      displayOrder,
    });

    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating category:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCategoryGrid(id: string, gridSpan: string) {
  try {
    const all = await getStoredCategories();
    const target = all.find((c) => c.id === id);
    if (target) {
      await updateStoredCategory({
        id,
        name: target.name,
        slug: target.slug,
        imageUrl: target.imageUrl,
        gridSpan,
        displayOrder: target.displayOrder,
      });
    }

    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating category grid:', error);
    return { success: false, error: error.message };
  }
}

export async function saveCategoryGridLayout(
  items: { id: string; gridSpan: string; displayOrder: number }[]
) {
  try {
    await saveStoredCategoriesLayout(items);
    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving category grid layout:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCategory(id: string) {
  try {
    await deleteStoredCategory(id);
    revalidatePath('/categorias');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false };
  }
}
