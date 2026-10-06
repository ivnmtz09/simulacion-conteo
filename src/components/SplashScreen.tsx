import React from 'react';
import { Loader2 } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm animate-in fade-in duration-300">
        {/* Logo / Emblema de Aforo Vial */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600 via-emerald-500 to-cyan-400 rounded-3xl blur-xl opacity-40 animate-pulse"></div>
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center font-black text-white text-3xl shadow-2xl border border-white/20">
            AV
          </div>
        </div>

        {/* Textos de la aplicación */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Aforo Vial
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              PTV Vissim
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Simulador y Aforo de Tráfico Vial con Teoría de Colas
          </p>
        </div>

        {/* Indicador de carga animado */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 shadow-inner">
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="text-xs font-medium text-slate-300">
              Verificando sesión segura...
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <span>Universidad de La Guajira</span>
            <span>•</span>
            <span>Equipo de Investigación</span>
          </div>
        </div>
      </div>
    </div>
  );
};
