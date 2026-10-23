'use server';

import { db, discountCodes, ensureSchema } from '@esqueleto/core';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createDiscountCode(formData: FormData) {
  await ensureSchema();

  const code = (formData.get('code') as string || '').trim().toUpperCase();
  const description = (formData.get('description') as string || '').trim() || null;
  const discountType = (formData.get('discountType') as string) || 'percentage';
  const rawValue = parseFloat((formData.get('discountValue') as string) || '0');
  const rawMinPurchase = parseFloat((formData.get('minPurchase') as string) || '0');
  const rawMaxDiscount = formData.get('maxDiscount') ? parseFloat(formData.get('maxDiscount') as string) : null;
  const rawUsageLimit = formData.get('usageLimit') ? parseInt(formData.get('usageLimit') as string, 10) : null;
  const expiresAtStr = formData.get('expiresAt') as string;

  if (!code) {
    return { success: false, error: 'El código de descuento es obligatorio' };
  }

  // Convertir valores monetarios a centavos o porcentaje
  const discountValue = discountType === 'percentage' 
    ? Math.round(rawValue) 
    : Math.round(rawValue * 100);

  const minPurchase = Math.round(rawMinPurchase * 100);
  const maxDiscount = rawMaxDiscount !== null ? Math.round(rawMaxDiscount * 100) : null;
  const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

  try {
    // Verificar si ya existe
    const existing = await db
      .select()
      .from(discountCodes)
      .where(eq(discountCodes.code, code))
      .execute();

    if (existing.length > 0) {
      return { success: false, error: `El código "${code}" ya existe en el sistema` };
    }

    await db.insert(discountCodes).values({
      code,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      usageLimit: rawUsageLimit,
      expiresAt,
      isActive: true,
    });

    revalidatePath('/cupones');
    return { success: true };
  } catch (error: any) {
    console.error('Error creando código de descuento:', error);
    return { success: false, error: error.message || 'Error al guardar el cupón' };
  }
}

export async function updateDiscountCode(formData: FormData) {
  await ensureSchema();

  const id = formData.get('id') as string;
  const code = (formData.get('code') as string || '').trim().toUpperCase();
  const description = (formData.get('description') as string || '').trim() || null;
  const discountType = (formData.get('discountType') as string) || 'percentage';
  const rawValue = parseFloat((formData.get('discountValue') as string) || '0');
  const rawMinPurchase = parseFloat((formData.get('minPurchase') as string) || '0');
  const rawMaxDiscount = formData.get('maxDiscount') ? parseFloat(formData.get('maxDiscount') as string) : null;
  const rawUsageLimit = formData.get('usageLimit') ? parseInt(formData.get('usageLimit') as string, 10) : null;
  const expiresAtStr = formData.get('expiresAt') as string;
  const isActive = formData.get('isActive') === 'true';

  if (!id || !code) {
    return { success: false, error: 'ID y código requeridos' };
  }

  const discountValue = discountType === 'percentage' 
    ? Math.round(rawValue) 
    : Math.round(rawValue * 100);

  const minPurchase = Math.round(rawMinPurchase * 100);
  const maxDiscount = rawMaxDiscount !== null ? Math.round(rawMaxDiscount * 100) : null;
  const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

  try {
    await db
      .update(discountCodes)
      .set({
        code,
        description,
        discountType,
        discountValue,
        minPurchase,
        maxDiscount,
        usageLimit: rawUsageLimit,
        expiresAt,
        isActive,
      })
      .where(eq(discountCodes.id, id));

    revalidatePath('/cupones');
    return { success: true };
  } catch (error: any) {
    console.error('Error actualizando cupón:', error);
    return { success: false, error: error.message || 'Error al actualizar cupón' };
  }
}

export async function toggleDiscountCodeStatus(id: string, currentStatus: boolean) {
  await ensureSchema();

  try {
    await db
      .update(discountCodes)
      .set({ isActive: !currentStatus })
      .where(eq(discountCodes.id, id));

    revalidatePath('/cupones');
    return { success: true };
  } catch (error: any) {
    console.error('Error alternando estado del cupón:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteDiscountCode(id: string) {
  await ensureSchema();

  try {
    await db.delete(discountCodes).where(eq(discountCodes.id, id));
    revalidatePath('/cupones');
    return { success: true };
  } catch (error: any) {
    console.error('Error eliminando cupón:', error);
    return { success: false, error: error.message };
  }
}
