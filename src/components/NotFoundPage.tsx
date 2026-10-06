import React from 'react';
import { Compass, Home, ArrowLeft, LogIn } from 'lucide-react';

interface NotFoundPageProps {
  usuarioActual: string | null;
  onVolverInicio: () => void;
  onAbrirAuth: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  usuarioActual,
  onVolverInicio,
  onAbrirAuth
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 max-w-md w-full text-center shadow-2xl space-y-6">
        {/* Ícono de Brújula / Dirección extraviada */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Compass className="w-10 h-10 animate-pulse" />
          <span className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono font-black text-xs shadow-md">
            404
          </span>
        </div>

        {/* Título y Mensaje */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Página no encontrada
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            La ruta solicitada no existe o fue movida en la plataforma de Aforo Vial.
          </p>
        </div>

        {/* Ruta actual solicitada */}
        <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 font-mono text-xs text-slate-400 truncate">
          {typeof window !== 'undefined' ? window.location.pathname : '/'}
        </div>

        {/* Botón de acción */}
        <div className="pt-2">
          {usuarioActual ? (
            <button
              type="button"
              onClick={onVolverInicio}
              className="touch-btn w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
            >
              <Home className="w-4 h-4" />
              <span>Volver a Conteo en Vivo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onAbrirAuth}
              className="touch-btn w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar sesión en Aforo Vial</span>
            </button>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={onVolverInicio}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ir a la página principal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
