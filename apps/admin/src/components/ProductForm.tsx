'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { createProduct, updateProduct } from '../actions/products';

interface ModifierOption {
  id?: string;
  name: string;
  priceDelta: number; // En centavos
  isDefault?: boolean;
}

interface ModifierGroup {
  id?: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: ModifierOption[];
}

interface ProductFormProps {
  categories: { id: string; name: string }[];
  initialData?: {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    basePrice: number; // En centavos
    categoryId: string | null;
    isFeatured?: boolean;
    modifiers: ModifierGroup[];
  };
  isEdit?: boolean;
}

export default function ProductForm({ categories, initialData, isEdit = false }: ProductFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData ? (initialData.basePrice / 100).toFixed(2) : '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured || false);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>(initialData?.modifiers || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para Drag & Drop y Compresión de Imagen
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: string;
    compressedSize: string;
    savingPercent: number;
  } | null>(null);
  const [manualUrlMode, setManualUrlMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Algoritmo de Compresión en el Navegador (Canvas a WebP optimizado)
  const compressImage = async (
    file: File
  ): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDimension = 1200; // Resolución estándar óptima para e-commerce

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
                  originalSize: file.size,
                  compressedSize: blob.size,
                });
              } else {
                reject(new Error('Error al comprimir imagen'));
              }
            },
            'image/webp',
            0.85 // Calidad óptima 85% WebP
          );
        };
        img.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP)');
      return;
    }

    try {
      setIsCompressing(true);
      setCompressionStats(null);

      // 1. Comprimir en cliente
      const { blob, originalSize, compressedSize } = await compressImage(file);

      // 2. Subir imagen comprimida al servidor
      const formData = new FormData();
      formData.append('file', blob, 'imagen-producto.webp');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al guardar la imagen en el servidor');
      }

      const data = await response.json();
      setImageUrl(data.url);

      // 3. Mostrar métricas de ahorro
      const formatKB = (bytes: number) =>
        bytes > 1024 * 1024
          ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(bytes / 1024)} KB`;

      const savingPercent = Math.max(
        0,
        Math.round(((originalSize - compressedSize) / originalSize) * 100)
      );

      setCompressionStats({
        originalSize: formatKB(originalSize),
        compressedSize: formatKB(compressedSize),
        savingPercent,
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al procesar la imagen');
    } finally {
      setIsCompressing(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleProcessFile(files[0]);
    }
  };

  // Funciones para gestionar Modificadores
  const addModifierGroup = () => {
    setModifiers([
      ...modifiers,
      {
        name: '',
        type: 'single',
        required: false,
        options: [{ name: 'Opción 1', priceDelta: 0, isDefault: true }],
      },
    ]);
  };

  const addPresetSizes = () => {
    setModifiers([
      ...modifiers,
      {
        name: 'Talla',
        type: 'single',
        required: true,
        options: [
          { name: 'Chica (CH)', priceDelta: 0, isDefault: true },
          { name: 'Mediana (M)', priceDelta: 0, isDefault: false },
          { name: 'Grande (G)', priceDelta: 0, isDefault: false },
          { name: 'Extra Grande (XG)', priceDelta: 3000, isDefault: false },
        ],
      },
    ]);
  };

  const addPresetColors = () => {
    setModifiers([
      ...modifiers,
      {
        name: 'Color',
        type: 'single',
        required: true,
        options: [
          { name: 'Negro', priceDelta: 0, isDefault: true },
          { name: 'Blanco', priceDelta: 0, isDefault: false },
          { name: 'Azul Marino', priceDelta: 0, isDefault: false },
        ],
      },
    ]);
  };

  const addPresetCustomization = () => {
    setModifiers([
      ...modifiers,
      {
        name: 'Personalización / Grabado',
        type: 'single',
        required: false,
        options: [
          { name: 'Estándar (Sin personalización)', priceDelta: 0, isDefault: true },
          { name: 'Iniciales grabadas', priceDelta: 5000, isDefault: false },
          { name: 'Nombre completo grabado', priceDelta: 9000, isDefault: false },
        ],
      },
    ]);
  };

  const addPresetExtras = () => {
    setModifiers([
      ...modifiers,
      {
        name: 'Complementos y Extras',
        type: 'multiple',
        required: false,
        options: [
          { name: 'Envoltura de Regalo con Moño', priceDelta: 3500, isDefault: false },
          { name: 'Garantía Extendida (1 año)', priceDelta: 12000, isDefault: false },
        ],
      },
    ]);
  };

  const removeModifierGroup = (index: number) => {
    setModifiers(modifiers.filter((_, i) => i !== index));
  };

  const updateModifierGroup = (index: number, field: keyof ModifierGroup, value: any) => {
    const updated = [...modifiers];
    updated[index] = { ...updated[index], [field]: value };
    setModifiers(updated);
  };

  const addOptionToGroup = (groupIndex: number) => {
    const updated = [...modifiers];
    updated[groupIndex].options.push({
      name: '',
      priceDelta: 0,
      isDefault: false,
    });
    setModifiers(updated);
  };

  const removeOptionFromGroup = (groupIndex: number, optionIndex: number) => {
    const updated = [...modifiers];
    updated[groupIndex].options = updated[groupIndex].options.filter((_, i) => i !== optionIndex);
    setModifiers(updated);
  };

  const updateOption = (
    groupIndex: number,
    optionIndex: number,
    field: keyof ModifierOption,
    value: any
  ) => {
    const updated = [...modifiers];
    const group = updated[groupIndex];
    group.options[optionIndex] = {
      ...group.options[optionIndex],
      [field]: value,
    };
    setModifiers(updated);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', title);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('category', categoryId);
    formData.append('image', imageUrl);
    formData.append('isFeatured', isFeatured ? 'true' : 'false');
    formData.append('modifiers', JSON.stringify(modifiers));

    try {
      if (isEdit && initialData?.id) {
        await updateProduct(initialData.id, formData);
      } else {
        await createProduct(formData);
      }
    } catch (err: any) {
      alert(err.message || 'Error al guardar el producto');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Datos Principales del Producto */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
          Información Básica
        </h2>

        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700">
            Nombre del Producto *
          </label>
          <input
            type="text"
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-black focus:ring-black sm:text-sm"
            placeholder="Ej. Playera Oversize Vintage"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700">
            Descripción Detallada
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-black focus:ring-black sm:text-sm"
            placeholder="Describe las características y materiales del producto..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="price" className="block text-sm font-semibold text-gray-700">
              Precio Base (MXN) *
            </label>
            <div className="relative mt-1 rounded-xl shadow-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 font-medium sm:text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                id="price"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="block w-full rounded-xl border border-gray-300 pl-8 pr-14 py-2.5 text-gray-900 font-semibold focus:border-black focus:ring-black sm:text-sm"
                placeholder="0.00"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 sm:text-xs font-mono">
                MXN
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              El precio inicial antes de aplicar modificadores opcionales.
            </p>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-gray-700">
              Categoría
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-black focus:ring-black sm:text-sm"
            >
              <option value="">Selecciona una categoría...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle de Producto Destacado en Inicio */}
          <div className="md:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                <span className="text-sm font-bold text-gray-900">Destacar en la Página de Inicio</span>
                {isFeatured && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Destacado Activo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Los productos destacados se exhibirán en la sección principal de la portada de la tienda para impulsar las ventas.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
            </label>
          </div>
        </div>

        {/* Zona de Imagen con Drag & Drop y Compresión Automática */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Imagen del Producto *
            </label>
            <button
              type="button"
              onClick={() => setManualUrlMode(!manualUrlMode)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {manualUrlMode ? '← Usar Drag & Drop / Compresión' : 'Ingresar URL manual'}
            </button>
          </div>

          {!manualUrlMode ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />

              {/* Contenedor Drag & Drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
                    : 'border-gray-300 hover:border-black bg-gray-50/50'
                }`}
              >
                {isCompressing ? (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2">
                    <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <p className="text-sm font-semibold text-gray-800">
                      Optimizando y comprimiendo imagen a WebP...
                    </p>
                    <p className="text-xs text-gray-400">
                      Reduciendo tamaño para máxima velocidad en tienda
                    </p>
                  </div>
                ) : (
                  <div className="py-4 flex flex-col items-center justify-center space-y-2">
                    <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900">
                        Arrastra tu imagen aquí
                      </span>{' '}
                      <span className="text-sm text-gray-500">o haz clic para explorar</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Compresión automática a WebP ultraligero • JPG, PNG o WebP hasta 20 MB
                    </p>
                  </div>
                )}
              </div>

              {/* Indicador de Ahorro y Optimización */}
              {compressionStats && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>
                    <strong>¡Optimizada!</strong> Reducida de {compressionStats.originalSize} a{' '}
                    <strong>{compressionStats.compressedSize}</strong> (-{compressionStats.savingPercent}% de peso).
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                type="url"
                id="image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-black focus:ring-black sm:text-sm font-mono text-xs"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          )}

          {/* Vista Previa de la Imagen Actual */}
          {imageUrl && (
            <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-gray-200 shrink-0 border border-gray-300">
                  <img
                    src={imageUrl}
                    alt="Vista previa"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 truncate max-w-xs">
                    {imageUrl}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium">
                    Imagen lista y enlazada
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageUrl('');
                  setCompressionStats(null);
                }}
                className="text-xs text-red-600 hover:text-red-800 font-semibold p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                Quitar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Sección de Modificadores y Precios Modificables */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-4 gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Modificadores y Personalizaciones del Producto
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Aquí decides exactamente qué puede personalizar el cliente (tallas, colores, grabado, extras) y cuánto suma al precio.
            </p>
          </div>
          <button
            type="button"
            onClick={addModifierGroup}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black transition-colors shrink-0 shadow-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + Grupo en Blanco
          </button>
        </div>

        {/* Barra de Plantillas Rápidas */}
        <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <span>Plantillas Rápidas con 1 Clic:</span>
            </span>
            <span className="text-[11px] text-indigo-600">Se añadirán automáticamente al formulario</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addPresetSizes}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-800 hover:bg-indigo-100/60 transition-colors shadow-2xs"
            >
              <span>+ Tallas (CH, M, G, XG)</span>
            </button>
            <button
              type="button"
              onClick={addPresetColors}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-800 hover:bg-indigo-100/60 transition-colors shadow-2xs"
            >
              <span>+ Colores (Negro, Blanco, Azul)</span>
            </button>
            <button
              type="button"
              onClick={addPresetCustomization}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-800 hover:bg-indigo-100/60 transition-colors shadow-2xs"
            >
              <span>+ Grabado Personalizado (+ $50 / $90)</span>
            </button>
            <button
              type="button"
              onClick={addPresetExtras}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-800 hover:bg-indigo-100/60 transition-colors shadow-2xs"
            >
              <span>+ Extras / Regalo (+ $35 / $120)</span>
            </button>
          </div>
        </div>

        {modifiers.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <p className="text-sm font-semibold text-gray-700">
              Este producto aún no tiene opciones personalizables.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Usa las plantillas rápidas de arriba o haz clic en "+ Grupo en Blanco" para definir qué puede modificar el cliente.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {modifiers.map((group, groupIdx) => (
              <div
                key={groupIdx}
                className="p-5 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-4"
              >
                {/* Cabecera del Grupo */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
                  <div className="flex-1 w-full sm:w-auto">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Nombre del Grupo #{groupIdx + 1}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Talla, Color, Extras, Molienda..."
                      value={group.name}
                      onChange={(e) => updateModifierGroup(groupIdx, 'name', e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold bg-white text-gray-900 focus:border-black focus:ring-black"
                    />
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Tipo de Selección
                      </label>
                      <select
                        value={group.type}
                        onChange={(e) => updateModifierGroup(groupIdx, 'type', e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800"
                      >
                        <option value="single">Selección Única (Radio)</option>
                        <option value="multiple">Múltiple (Checkboxes)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer pt-4">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(e) => updateModifierGroup(groupIdx, 'required', e.target.checked)}
                        className="rounded text-black focus:ring-black h-4 w-4"
                      />
                      Obligatorio
                    </label>

                    <button
                      type="button"
                      onClick={() => removeModifierGroup(groupIdx)}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors pt-4"
                      title="Eliminar grupo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Lista de Opciones dentro del Grupo */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Opciones y Ajustes de Precio (en MXN)
                  </div>

                  {group.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200"
                    >
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Nombre de la opción (ej. Grande (L), Leche de Almendras)"
                          value={opt.name}
                          onChange={(e) => updateOption(groupIdx, optIdx, 'name', e.target.value)}
                          className="block w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:border-black focus:ring-black"
                        />
                      </div>

                      <div className="w-36">
                        <div className="relative rounded-lg shadow-sm">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400 text-xs">
                            +$
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={(opt.priceDelta / 100).toFixed(2)}
                            onChange={(e) => {
                              const cents = Math.round((parseFloat(e.target.value) || 0) * 100);
                              updateOption(groupIdx, optIdx, 'priceDelta', cents);
                            }}
                            className="block w-full rounded-lg border border-gray-200 pl-7 pr-2 py-1.5 text-sm font-mono text-gray-900 focus:border-black focus:ring-black"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={opt.isDefault || false}
                          onChange={(e) => updateOption(groupIdx, optIdx, 'isDefault', e.target.checked)}
                          className="rounded text-black focus:ring-black h-4 w-4"
                        />
                        <span>Default</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeOptionFromGroup(groupIdx, optIdx)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-md"
                        title="Eliminar opción"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addOptionToGroup(groupIdx)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Añadir Opción al Grupo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center justify-end space-x-4 border-t border-gray-200 pt-6">
        <Link
          href="/productos"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || isCompressing}
          className="inline-flex justify-center items-center rounded-xl bg-black px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Producto'}
        </button>
      </div>
    </form>
  );
}
