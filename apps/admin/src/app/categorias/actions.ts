'use server';

import { db, categories, products, eq } from '@esqueleto/core';
import { revalidatePath } from 'next/cache';

export async function createCategory(formData: FormData) {
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;

  if (!name || !slug) return;

  try {
    await db.insert(categories).values({
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
    });
    revalidatePath('/categorias');
  } catch (error) {
    console.error('Error creating category:', error);
  }
}

export async function deleteCategory(id: string) {
  try {
    await db.delete(categories).where(eq(categories.id, id));
    revalidatePath('/categorias');
  } catch (error) {
    console.error('Error deleting category:', error);
  }
}
