'use client';

import { useState, useRef } from 'react';
import { updateSiteSettings } from './actions';

interface AppearanceFormProps {
  initialSettings: {
    siteName: string;
    logoSvg: string | null;
    logoColor: string;
    heroTitle: string;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
    heroCtaText: string;
    heroCtaLink: string;
  };
}

const COLOR_PRESETS = [
  { name: 'Índigo Royal', hex: '#4f46e5' },
  { name: 'Violeta Neón', hex: '#7c3aed' },
  { name: 'Esmeralda Pro', hex: '#059669' },
  { name: 'Negro Pitch', hex: '#111827' },
  { name: 'Ámbar Cálido', hex: '#d97706' },
  { name: 'Rojo Carmesí', hex: '#dc2626' },
  { name: 'Azul Eléctrico', hex: '#2563eb' },
  { name: 'Rosa Fucsia', hex: '#db2777' },
];

const DEFAULT_SVG_PRESET = `<svg viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;

export default function AppearanceForm({ initialSettings }: AppearanceFormProps) {
  const [siteName, setSiteName] = useState(initialSettings.siteName || 'ESQUELETO');
  const [logoSvg, setLogoSvg] = useState(initialSettings.logoSvg || '');
  const [logoColor, setLogoColor] = useState(initialSettings.logoColor || '#4f46e5');
  const [heroTitle, setHeroTitle] = useState(initialSettings.heroTitle || 'Velocidad extrema. Control total en Docker.');
  const [heroSubtitle, setHeroSubtitle] = useState(initialSettings.heroSubtitle || 'E-commerce Open Source Plug & Play de alto rendimiento.');
  const [heroImageUrl, setHeroImageUrl] = useState(initialSettings.heroImageUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80');
  const [heroCtaText, setHeroCtaText] = useState(initialSettings.heroCtaText || 'Explorar Catálogo');
  const [heroCtaLink, setHeroCtaLink] = useState(initialSettings.heroCtaLink || '/catalogo');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; msg: string } | null>(null);

  // Estados para Drag & Drop y Compresión de Imagen del Hero
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [stats, setStats] = useState<{ original: string; compressed: string; savings: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<{ blob: Blob; origKb: number; compKb: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDimension = 1920; // Resolución óptima para banner Hero

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas no soportado'));

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  origKb: Math.round(file.size / 1024),
                  compKb: Math.round(blob.size / 1024),
                });
              } else {
                reject(new Error('Error en compresión'));
              }
            },
            'image/webp',
            0.85
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen.');
      return;
    }

    try {
      setIsCompressing(true);
      const { blob, origKb, compKb } = await compressImage(file);
      const savingPercent = origKb > 0 ? Math.round(((origKb - compKb) / origKb) * 100) : 0;
      setStats({
        original: `${origKb} KB`,
        compressed: `${compKb} KB`,
        savings: savingPercent,
      });

      const formData = new FormData();
      formData.append('file', blob, 'hero-banner.webp');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error al subir la imagen comprimida');
      const data = await response.json();
      setHeroImageUrl(data.url);
    } catch (err: any) {
      console.error(err);
      alert('Fallo al comprimir y subir imagen: ' + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveStatus(null);

    const formData = new FormData();
    formData.append('siteName', siteName);
    formData.append('logoSvg', logoSvg);
    formData.append('logoColor', logoColor);
    formData.append('heroTitle', heroTitle);
    formData.append('heroSubtitle', heroSubtitle || '');
    formData.append('heroImageUrl', heroImageUrl || '');
    formData.append('heroCtaText', heroCtaText);
    formData.append('heroCtaLink', heroCtaLink);

    const res = await updateSiteSettings(formData);
    setIsSubmitting(false);

    if (res.success) {
      setSaveStatus({ success: true, msg: '¡Configuración de diseño guardada con éxito!' });
      setTimeout(() => setSaveStatus(null), 4000);
    } else {
      setSaveStatus({ success: false, msg: res.error || 'Error al guardar.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {saveStatus && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm transition-all ${
            saveStatus.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{saveStatus.msg}</span>
          <button
            type="button"
            onClick={() => setSaveStatus(null)}
            className="text-xs underline hover:opacity-80"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* SECCIÓN 1: IDENTIDAD Y LOGO SVG */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="border-b border-gray-100 pb-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>✨</span> Logotipo SVG y Color de Marca
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Personaliza el logotipo SVG y la paleta de color que se mostrará en la barra de navegación de tu tienda.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Nombre de la Tienda</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Ej. AFÓTICA SHOP"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm focus:border-black focus:ring-black sm:text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Código SVG Personalizado
                </label>
                <button
                  type="button"
                  onClick={() => setLogoSvg(DEFAULT_SVG_PRESET)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Usar SVG de ejemplo
                </button>
              </div>
              <textarea
                rows={4}
                value={logoSvg}
                onChange={(e) => setLogoSvg(e.target.value)}
                placeholder='<svg viewBox="0 0 24 24" fill="currentColor">...</svg>'
                className="block w-full rounded-xl border border-gray-300 p-3 font-mono text-xs shadow-sm focus:border-black focus:ring-black text-gray-700"
              />
              <p className="text-xs text-gray-400 mt-1">
                Pega aquí tu código SVG. Recuerda usar <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">fill="currentColor"</code> para que tome automáticamente el color que elijas.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Color de Marca / Logo
              </label>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="color"
                  value={logoColor}
                  onChange={(e) => setLogoColor(e.target.value)}
                  className="h-10 w-12 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={logoColor}
                  onChange={(e) => setLogoColor(e.target.value)}
                  placeholder="#4f46e5"
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase"
                />
              </div>

              {/* Presets de Color */}
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setLogoColor(preset.hex)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: logoColor.toLowerCase() === preset.hex.toLowerCase() ? '#f3f4f6' : '#ffffff',
                    }}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/10 inline-block"
                      style={{ backgroundColor: preset.hex }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* VISTA PREVIA DEL LOGO EN NAVBAR */}
          <div className="flex flex-col justify-center">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Vista Previa en Barra de Navegación
            </label>
            <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center min-h-[220px]">
              <div className="w-full max-w-sm bg-white rounded-xl shadow-md border border-gray-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {logoSvg.trim() ? (
                    <div
                      className="w-8 h-8 flex items-center justify-center transition-colors"
                      style={{ color: logoColor }}
                      dangerouslySetInnerHTML={{ __html: logoSvg }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-sm"
                      style={{ backgroundColor: logoColor }}
                    >
                      {siteName.charAt(0) || 'E'}
                    </div>
                  )}
                  <span className="font-bold text-gray-900 tracking-tight text-lg">
                    {siteName}
                    <span style={{ color: logoColor }}>.</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-200" />
                  <span className="w-2 h-2 rounded-full bg-gray-200" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">
                Así se verá tu cabecera tanto en computadora como en teléfonos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: BANNER PRINCIPAL (HERO SECTION) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="border-b border-gray-100 pb-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🖼️</span> Banner Principal de Inicio (Hero)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configura la imagen de fondo, los textos promocionales y el botón principal de la página de inicio.
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Título del Banner</label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Ej. Nueva Colección Otoño - Invierno"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm focus:border-black focus:ring-black sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Texto del Botón (CTA)</label>
              <input
                type="text"
                value={heroCtaText}
                onChange={(e) => setHeroCtaText(e.target.value)}
                placeholder="Ej. Explorar Catálogo"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm focus:border-black focus:ring-black sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Subtítulo / Descripción</label>
              <textarea
                rows={2}
                value={heroSubtitle || ''}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="Breve descripción atractiva para los visitantes..."
                className="mt-1 block w-full rounded-xl border border-gray-300 p-3 shadow-sm focus:border-black focus:ring-black sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Enlace del Botón (Ruta)</label>
              <input
                type="text"
                value={heroCtaLink}
                onChange={(e) => setHeroCtaLink(e.target.value)}
                placeholder="/catalogo o /categorias"
                className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 shadow-sm focus:border-black focus:ring-black sm:text-sm font-mono text-xs"
              />
            </div>
          </div>

          {/* DRAG & DROP PARA IMAGEN DEL HERO */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Imagen de Fondo del Banner
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">☁️</span>
                <p className="text-sm font-semibold text-gray-800">
                  {isCompressing
                    ? 'Comprimiendo a WebP y subiendo...'
                    : 'Arrastra y suelta aquí la imagen para el Banner, o haz clic para buscar'}
                </p>
                <p className="text-xs text-gray-500">
                  Compresión automática a WebP en el navegador (1920px max).
                </p>
              </div>
            </div>

            {/* Estadísticas de compresión */}
            {stats && (
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-block font-mono">
                ✓ Comprimido: {stats.original} ➔ {stats.compressed} ({stats.savings}% ahorro)
              </div>
            )}

            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">O ingresa una URL directa de imagen:</label>
              <input
                type="text"
                value={heroImageUrl || ''}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono text-gray-700"
              />
            </div>
          </div>

          {/* VISTA PREVIA EN VIVO DEL HERO */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Vista Previa en Vivo del Banner
            </label>
            <div
              className="relative isolate overflow-hidden rounded-3xl bg-gray-900 py-16 sm:py-24 text-center shadow-2xl transition-all"
              style={{
                backgroundImage: heroImageUrl ? `url('${heroImageUrl}')` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Overlay oscuro para legibilidad */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

              <div className="relative z-10 mx-auto max-w-2xl px-6">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mb-4 ring-1 ring-inset"
                  style={{
                    backgroundColor: `${logoColor}22`,
                    color: logoColor,
                    borderColor: `${logoColor}55`,
                  }}
                >
                  {siteName} • Destacado
                </span>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl drop-shadow-md">
                  {heroTitle}
                </h1>
                <p className="mt-4 text-base leading-7 text-gray-200 drop-shadow">
                  {heroSubtitle}
                </p>
                <div className="mt-8 flex items-center justify-center gap-x-6">
                  <span
                    className="rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition-transform hover:scale-105 cursor-pointer text-white"
                    style={{ backgroundColor: logoColor }}
                  >
                    {heroCtaText} &rarr;
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTÓN FLOTANTE O INFERIOR DE GUARDAR */}
      <div className="sticky bottom-6 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-black hover:bg-gray-800 text-white font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Guardando cambios...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Guardar Configuración de Diseño</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
