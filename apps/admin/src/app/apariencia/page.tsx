import { db, siteSettings, ensureSchema } from '@esqueleto/core';
import { eq } from 'drizzle-orm';
import AppearanceForm from './AppearanceForm';

export default async function AparienciaPage() {
  await ensureSchema().catch(() => {});

  let settingsList: any[] = [];
  try {
    settingsList = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, 'default'))
      .execute();
  } catch (err) {
    console.error('Error al cargar configuración de apariencia:', err);
  }

  const currentSettings = settingsList[0] || {
    siteName: 'ESQUELETO',
    logoSvg: '',
    logoColor: '#4f46e5',
    heroTitle: 'Velocidad extrema. Control total en Docker.',
    heroSubtitle: 'E-commerce Open Source Plug & Play de alto rendimiento con catálogo interactivo y checkout seguro.',
    heroImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
    heroCtaText: 'Explorar Catálogo',
    heroCtaLink: '/catalogo',
  };

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            Personalizador de Marca
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">
            Diseño, Banner y Logotipo
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Controla visualmente la apariencia de tu tienda: cambia el banner principal, el logotipo SVG y los colores de la marca en tiempo real.
          </p>
        </div>
      </div>

      <AppearanceForm initialSettings={currentSettings} />
    </main>
  );
}
