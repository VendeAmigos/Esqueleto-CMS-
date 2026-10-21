import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Acceso Seguro | ESQUELETO CMS',
  description: 'Iniciar sesión en el panel de administración',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Luces y Efectos de Fondo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Tarjeta de Seguridad (Glassmorphism) */}
      <div className="w-full max-w-md bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 space-y-8">
        
        {/* Cabecera con Icono y Marca */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-2 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              ESQUELETO<span className="text-indigo-500">.</span> CMS
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Acceso seguro al panel de control y catálogo
            </p>
          </div>
        </div>

        {/* Formulario Interactivo */}
        <Suspense
          fallback={
            <div className="py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Cargando formulario de seguridad...</span>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>

      {/* Pie de Página */}
      <footer className="mt-8 text-center text-xs text-gray-600 relative z-10">
        <p>&copy; {new Date().getFullYear()} ESQUELETO E-commerce Open Source. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
