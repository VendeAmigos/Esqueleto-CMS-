'use server';

import { saveStoredSiteSettings } from '@esqueleto/core';
import { revalidatePath } from 'next/cache';

function sanitizeSvgMarkup(rawSvg: string): string {
  if (!rawSvg) return '';
  return rawSvg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .trim();
}

export async function updateSiteSettings(formData: FormData) {
  const siteName = formData.get('siteName')?.toString()?.trim() || 'LUNA ART STUDIO';
  const rawSvg = formData.get('logoSvg')?.toString() || '';
  const logoSvg = sanitizeSvgMarkup(rawSvg);
  const logoColor = formData.get('logoColor')?.toString() || '#ec4899';
  const headingFont = formData.get('headingFont')?.toString() || 'Plus Jakarta Sans';
  const bodyFont = formData.get('bodyFont')?.toString() || 'Inter';
  const heroTitle =
    formData.get('heroTitle')?.toString() ||
    'Ilustración de Autor, Prints & Merch Exclusivo';
  const heroSubtitle = formData.get('heroSubtitle')?.toString() || '';
  const heroImageUrl = formData.get('heroImageUrl')?.toString() || '';
  const heroCtaText = formData.get('heroCtaText')?.toString() || 'Explorar Catálogo';
  const heroCtaLink = formData.get('heroCtaLink')?.toString() || '/catalogo';

  try {
    await saveStoredSiteSettings({
      siteName,
      logoSvg,
      logoColor,
      headingFont,
      bodyFont,
      heroTitle,
      heroSubtitle,
      heroImageUrl,
      heroCtaText,
      heroCtaLink,
    });

    revalidatePath('/apariencia');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error actualizando apariencia:', error);
    return { success: false, error: error.message };
  }
}
