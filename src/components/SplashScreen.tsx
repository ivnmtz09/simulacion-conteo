import React from 'react';
import { Loader2, Car, Users, GraduationCap } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm animate-in fade-in duration-300">
        {/* Logo / Emblema de Aforo & Conteo */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600 via-sky-500 to-emerald-500 rounded-3xl blur-xl opacity-40 animate-pulse"></div>
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-600 to-emerald-500 flex flex-col items-center justify-center text-white shadow-2xl border border-white/20">
            <span className="font-black text-2xl tracking-wider leading-none">AC</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-90 mt-1">Uniguajira</span>
          </div>
        </div>

        {/* Textos de la aplicación */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Sistema de Aforo y Conteo
          </h1>
          <p className="text-xs text-slate-400">
            Plataforma Integral de Tránsito Vial y Aforo Universitario
          </p>
          <div className="text-[11px] font-bold text-sky-400 tracking-wide pt-0.5">
            Universidad de La Guajira
          </div>
        </div>

        {/* Énfasis en los Docentes Líderes */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-left shadow-lg">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider pb-1 border-b border-slate-800">
            <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
            <span>Docentes Asesores del Proyecto</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-blue-300 font-semibold">
                <Car className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Aforo Vial:</span>
              </div>
              <span className="font-bold text-white text-xs">
                Marlyn Aaron
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Aforo Universitario:</span>
              </div>
              <span className="font-bold text-white text-xs">
                Robert Quintero
              </span>
            </div>
          </div>
        </div>

        {/* Indicador de carga animado */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 shadow-inner">
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="text-xs font-medium text-slate-300">
              Verificando sesión segura...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
