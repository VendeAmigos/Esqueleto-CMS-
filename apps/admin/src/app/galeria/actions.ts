'use server';

import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import {
  bulkUpdateStoredMediaVisibility,
  deleteStoredMediaItem,
  resolveUploadsRootDir,
  saveStoredGalleryLayout,
  updateStoredMediaItem,
} from '@esqueleto/core';

async function ensureAdminAuth() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new Error('Sesión no autorizada.');
  }
  const session = await verifySessionToken(token);
  if (!session) {
    throw new Error('Sesión inválida o expirada.');
  }
  return session;
}

export async function toggleMediaVisibilityAction(id: string, showInGallery: boolean) {
  try {
    await ensureAdminAuth();
    const updated = await updateStoredMediaItem(id, { showInGallery });
    if (!updated) {
      return { success: false, error: 'Fotografía no encontrada.' };
    }
    revalidatePath('/galeria');
    return { success: true, item: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || 'No se pudo actualizar la visibilidad.' };
  }
}

export async function bulkToggleMediaVisibilityAction(ids: string[], showInGallery: boolean) {
  try {
    await ensureAdminAuth();
    await bulkUpdateStoredMediaVisibility(ids, showInGallery);
    revalidatePath('/galeria');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'No se pudo actualizar el lote.' };
  }
}

export async function updateMediaItemFormatAction(
  id: string,
  patch: { gridSpan?: string; title?: string | null; showInGallery?: boolean }
) {
  try {
    await ensureAdminAuth();
    const updated = await updateStoredMediaItem(id, patch);
    if (!updated) {
      return { success: false, error: 'Fotografía no encontrada.' };
    }
    revalidatePath('/galeria');
    return { success: true, item: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || 'No se pudo actualizar la fotografía.' };
  }
}

export async function saveGalleryGridLayoutAction(
  columns: number,
  updates: { id: string; gridSpan: string; displayOrder: number }[]
) {
  try {
    await ensureAdminAuth();
    await saveStoredGalleryLayout(columns, updates);
    revalidatePath('/galeria');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'No se pudo guardar el acomodo del grid.' };
  }
}

export async function deleteMediaItemAction(id: string, removeFileFromDisk = true) {
  try {
    await ensureAdminAuth();
    const removed = await deleteStoredMediaItem(id);
    if (!removed) {
      return { success: false, error: 'Fotografía no encontrada.' };
    }

    if (removeFileFromDisk && removed.url.startsWith('/uploads/')) {
      const uploadsDir = resolveUploadsRootDir();
      const targetPath = path.join(uploadsDir, path.basename(removed.url));
      await fs.promises.unlink(targetPath).catch(() => {});
    }

    revalidatePath('/galeria');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'No se pudo eliminar la fotografía.' };
  }
}
