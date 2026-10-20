'use server';

import { db, siteSettings, eq, ensureSchema } from '@esqueleto/core';
import { revalidatePath } from 'next/cache';

export async function updateSiteSettings(formData: FormData) {
  await ensureSchema();

  const siteName = formData.get('siteName')?.toString() || 'ESQUELETO';
  const logoSvg = formData.get('logoSvg')?.toString() || null;
  const logoColor = formData.get('logoColor')?.toString() || '#4f46e5';
  const heroTitle = formData.get('heroTitle')?.toString() || 'Velocidad extrema. Control total en Docker.';
  const heroSubtitle = formData.get('heroSubtitle')?.toString() || '';
  const heroImageUrl = formData.get('heroImageUrl')?.toString() || '';
  const heroCtaText = formData.get('heroCtaText')?.toString() || 'Explorar Catálogo';
  const heroCtaLink = formData.get('heroCtaLink')?.toString() || '/catalogo';

  try {
    const existing = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 'default'))
      .execute();

    if (existing.length > 0) {
      await db
        .update(siteSettings)
        .set({
          siteName,
          logoSvg,
          logoColor,
          heroTitle,
          heroSubtitle,
          heroImageUrl,
          heroCtaText,
          heroCtaLink,
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.id, 'default'));
    } else {
      await db.insert(siteSettings).values({
        id: 'default',
        siteName,
        logoSvg,
        logoColor,
        heroTitle,
        heroSubtitle,
        heroImageUrl,
        heroCtaText,
        heroCtaLink,
      });
    }

    revalidatePath('/apariencia');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error actualizando apariencia:', error);
    return { success: false, error: error.message };
  }
}
