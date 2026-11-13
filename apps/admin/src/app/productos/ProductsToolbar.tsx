"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { bulkImportProductsAction, type BulkProductRowInput } from "../../actions/products";

interface ExistingProductSummary {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number; // centavos
  isFeatured: boolean;
  isActive: boolean;
  categoryName: string;
}

interface ProductsToolbarProps {
  existingProducts: ExistingProductSummary[];
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseBulkText(rawText: string): BulkProductRowInput[] {
  const trimmed = rawText.trim().replace(/^\uFEFF/, "");
  if (!trimmed) return [];

  // 1. Si es JSON
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr
        .map((item: any) => ({
          id: item.id ? String(item.id) : undefined,
          title: String(item.title || item.nombre || item.name || "").trim(),
          description: String(item.description || item.descripcion || "").trim(),
          priceMxn: Number(
            item.priceMxn ??
              item.precio_mxn ??
              item.precio ??
              (item.basePrice ? item.basePrice / 100 : 0)
          ),
          categoryNameOrSlug: String(
            item.categoryNameOrSlug || item.categoria || item.category || "General"
          ).trim(),
          imageUrl: String(item.imageUrl || item.imagen_url || item.image || "").trim(),
          isFeatured:
            item.isFeatured === true ||
            String(item.destacado || "").toLowerCase() === "si" ||
            String(item.destacado || "").toLowerCase() === "true",
          isActive:
            item.isActive !== false &&
            String(item.activo || "si").toLowerCase() !== "no" &&
            String(item.activo || "true").toLowerCase() !== "false",
        }))
        .filter((r) => r.title.length > 0);
    } catch {
      // Continuar con CSV/TSV
    }
  }

  // 2. CSV o TSV (pegado directo desde Excel / Google Sheets)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : firstLine.split(";").length > firstLine.split(",").length
    ? ";"
    : ",";

  const headerCols = parseCsvLine(firstLine, delimiter).map((h) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]/g, "")
  );

  const hasHeader = headerCols.some((h) =>
    ["nombre", "title", "producto", "precio", "preciomxn", "precio_mxn"].includes(h)
  );

  const dataLines = hasHeader ? lines.slice(1) : lines;

  const findIdx = (candidates: string[], fallbackIdx: number) => {
    if (!hasHeader) return fallbackIdx;
    const found = headerCols.findIndex((h) => candidates.includes(h));
    return found;
  };

  const idxId = findIdx(["id", "sku", "codigo"], -1);
  const idxTitle = findIdx(["nombre", "title", "producto", "name"], 0);
  const idxDesc = findIdx(["descripcion", "description", "detalle"], 1);
  const idxPrice = findIdx(["preciomxn", "precio_mxn", "precio", "price"], 2);
  const idxCat = findIdx(["categoria", "category", "coleccion"], 3);
  const idxImg = findIdx(["imagenurl", "imagen_url", "imagen", "image", "foto"], 4);
  const idxFeat = findIdx(["destacado", "featured"], 5);
  const idxAct = findIdx(["activo", "active"], 6);

  const rows: BulkProductRowInput[] = [];
  for (const line of dataLines) {
    const cols = parseCsvLine(line, delimiter);
    const title = (idxTitle >= 0 ? cols[idxTitle] : cols[0]) || "";
    if (!title.trim()) continue;

    const rawPrice = ((idxPrice >= 0 ? cols[idxPrice] : "0") || "0").replace(/[^0-9.]/g, "");
    const featStr = ((idxFeat >= 0 ? cols[idxFeat] : "") || "").toLowerCase();
    const actStr = ((idxAct >= 0 ? cols[idxAct] : "si") || "si").toLowerCase();

    rows.push({
      id: idxId >= 0 && cols[idxId] ? cols[idxId].trim() : undefined,
      title: title.trim(),
      description: idxDesc >= 0 && cols[idxDesc] ? cols[idxDesc].trim() : "",
      priceMxn: parseFloat(rawPrice) || 0,
      categoryNameOrSlug: idxCat >= 0 && cols[idxCat] ? cols[idxCat].trim() : "General",
      imageUrl: idxImg >= 0 && cols[idxImg] ? cols[idxImg].trim() : "",
      isFeatured: ["si", "sí", "true", "1", "yes"].includes(featStr),
      isActive: !["no", "false", "0"].includes(actStr),
    });
  }

  return rows;
}

export default function ProductsToolbar({ existingProducts }: ProductsToolbarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [previewRows, setPreviewRows] = useState<BulkProductRowInput[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (text: string) => {
    setRawInput(text);
    setPreviewRows(parseBulkText(text));
    setResultMsg(null);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = String(e.target?.result || "");
      handleTextChange(content);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDownloadTemplate = () => {
    const csvRows = [
      "id,nombre,descripcion,precio_mxn,categoria,imagen_url,destacado,activo",
      ',Vela Aromática Lavanda & Coco,"Cera de soya artesanal 250g",280.00,Ediciones Especiales,/seed/prod-print-jardin.jpg,si,si',
      ',Libreta Puntillada Astral,"Pasta dura 160 páginas 120g",195.00,Libretas & Journals,/seed/prod-sketchbook.jpg,no,si',
    ];
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-productos-cms.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCurrentCatalog = () => {
    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const header = "id,nombre,descripcion,precio_mxn,categoria,imagen_url,destacado,activo";
    const lines = existingProducts.map((p) =>
      [
        escapeCsv(p.id),
        escapeCsv(p.title),
        escapeCsv(p.description || ""),
        (p.price / 100).toFixed(2),
        escapeCsv(p.categoryName || "General"),
        escapeCsv(p.imageUrl || ""),
        p.isFeatured ? "si" : "no",
        p.isActive ? "si" : "no",
      ].join(",")
    );

    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo-productos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = async () => {
    if (previewRows.length === 0) return;
    setIsImporting(true);
    setResultMsg(null);
    try {
      const res = await bulkImportProductsAction(previewRows);
      if (res.success) {
        setResultMsg(
          `¡Carga completada! ${res.created} productos nuevos creados y ${res.updated} actualizados.`
        );
        router.refresh();
        setTimeout(() => {
          setIsOpen(false);
          setRawInput("");
          setPreviewRows([]);
          setResultMsg(null);
        }, 1600);
      } else {
        alert(res.error || "Error al importar productos");
      }
    } catch (e: any) {
      alert(e.message || "Error en la importación masiva");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleExportCurrentCatalog}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-2 text-xs"
          title="Exportar catálogo actual a Excel / CSV para editar precios masivamente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Exportar CSV / Excel</span>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 text-xs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Carga Masiva (CSV / Excel / JSON)</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 space-y-6 my-4 sm:my-8">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Importador & Actualizador Masivo
                </span>
                <h2 className="text-xl font-extrabold text-gray-900 mt-0.5">
                  Carga Masiva de Productos (Excel / CSV / Google Sheets / JSON)
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Si incluyes la columna <code className="bg-gray-100 px-1 rounded">id</code> de un producto existente, se actualizará su precio/datos. Si la dejas vacía, se creará como producto nuevo.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar modal"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Opciones de descarga y subida de archivo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="p-3.5 rounded-2xl border border-gray-200 hover:border-black bg-gray-50/70 text-left transition-all"
              >
                <div className="text-xs font-bold text-gray-900">1. Descargar Plantilla Excel/CSV</div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Archivo listo con columnas de ejemplo para abrir en Excel o Google Sheets.
                </p>
              </button>

              <button
                type="button"
                onClick={handleExportCurrentCatalog}
                className="p-3.5 rounded-2xl border border-gray-200 hover:border-black bg-gray-50/70 text-left transition-all"
              >
                <div className="text-xs font-bold text-gray-900">2. Exportar Catálogo Actual</div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Descarga tus {existingProducts.length} productos actuales, edita precios en Excel y vuelve a subirlos.
                </p>
              </button>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/40 cursor-pointer text-left transition-all"
              >
                <div className="text-xs font-bold text-indigo-950">3. Subir Archivo (.CSV o .JSON)</div>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Haz clic aquí para seleccionar tu archivo desde tu computadora.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv,.json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                />
              </div>
            </div>

            {/* Área para pegar directo desde Excel o Google Sheets */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                O pega tus filas directamente desde Excel / Google Sheets / CSV / JSON:
              </label>
              <textarea
                rows={5}
                value={rawInput}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={`nombre,descripcion,precio_mxn,categoria,imagen_url,destacado,activo\nVela Lavanda,Cera de soya 250g,280.00,Ediciones Especiales,https://...,si,si`}
                className="w-full rounded-2xl border border-gray-300 p-3.5 text-xs font-mono text-gray-800 focus:border-black focus:ring-black"
              />
            </div>

            {/* Vista Previa de Productos Detectados */}
            {previewRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {previewRows.length} producto(s) listos para importar / actualizar
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-2xl">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Acción</th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Nombre</th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Categoría</th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Precio MXN</th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">Destacado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {previewRows.map((row, idx) => {
                        const isUpdate = Boolean(
                          row.id && existingProducts.some((p) => p.id === row.id)
                        );
                        return (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isUpdate
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {isUpdate ? "Actualizar" : "Nuevo"}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-semibold text-gray-900">{row.title}</td>
                            <td className="px-3 py-2 text-gray-600">{row.categoryNameOrSlug}</td>
                            <td className="px-3 py-2 font-mono font-bold text-gray-900">
                              ${Number(row.priceMxn || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2">{row.isFeatured ? "Sí (Destacado)" : "No"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {resultMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900">
                {resultMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={previewRows.length === 0 || isImporting}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 disabled:opacity-40 transition-all"
              >
                {isImporting
                  ? "Importando productos..."
                  : `Importar / Actualizar ${previewRows.length} Producto(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

