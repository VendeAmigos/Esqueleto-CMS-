import { getStoredSiteSettings } from '@esqueleto/core';
import AppearanceForm from './AppearanceForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AparienciaPage() {
  const currentSettings = await getStoredSiteSettings();

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <div className="border-b border-gray-200 pb-5 mb-8 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            Personalizador de Marca (Boilerplate Multi-Cliente)
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">
            Diseño, Logotipo SVG, Tipografía y Banner
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Sube tu archivo <code className="bg-gray-100 px-1.5 py-0.5 rounded">.svg</code> como logotipo, elige las tipografías de la tienda y personaliza el banner principal en tiempo real.
          </p>
        </div>
      </div>

      <AppearanceForm initialSettings={currentSettings} />
    </main>
  );
}
