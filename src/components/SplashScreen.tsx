import React from 'react';
import { Car, Users, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-6 sm:p-8 select-none font-sans overflow-hidden">
      {/* Luces de fondo ambientadas */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-600/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl" />

      {/* Cabecera / Marca Institucional */}
      <div className="w-full flex items-center justify-between text-xs text-slate-400 max-w-sm pt-2">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[10px] text-sky-400">
          <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
          <span>Uniguajira</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium tracking-wider">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Facultad de Ingeniería</span>
        </div>
      </div>

      {/* Contenido Central */}
      <div className="flex flex-col items-center text-center space-y-6 max-w-sm w-full py-4 my-auto">
        {/* Emblema con anillos de carga concéntricos */}
        <div className="relative flex items-center justify-center w-28 h-28">
          {/* Anillo exterior de rotación lenta */}
          <div className="absolute w-28 h-28 rounded-3xl border border-sky-500/20 animate-spin-slow" />
          
          {/* Anillo interior punteado en sentido inverso */}
          <div className="absolute w-24 h-24 rounded-2xl border border-dashed border-emerald-500/25 animate-spin-reverse" />
          
          {/* Resplandor pulsante */}
          <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600 via-sky-500 to-emerald-500 rounded-3xl blur-xl opacity-40 animate-pulse" />
          
          {/* Escudo central AC */}
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-600 to-emerald-500 flex flex-col items-center justify-center text-white shadow-2xl shadow-sky-950/60 border border-white/20 backdrop-blur-sm">
            <span className="font-black text-2xl tracking-wider leading-none drop-shadow-md">
              AC
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest opacity-95 mt-1 drop-shadow-sm">
              Uniguajira
            </span>
          </div>
        </div>

        {/* Título y subtítulo */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>Sistema Integral de Investigación</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Sistema de Aforo y Conteo
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Plataforma Institucional para Aforo Vial y Conteo Universitario
          </p>
        </div>

        {/* Módulos activos */}
        <div className="grid grid-cols-2 gap-2 w-full pt-1">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-blue-900/30 text-left">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Car className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Módulo</div>
              <div className="text-xs font-semibold text-blue-300 truncate">Aforo Vial</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-emerald-900/30 text-left">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Módulo</div>
              <div className="text-xs font-semibold text-emerald-300 truncate">Aforo Peatonal</div>
            </div>
          </div>
        </div>

        {/* Tarjeta de Reconocimiento a Docentes Asesores */}
        <div className="w-full bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5 text-left shadow-xl shadow-black/40 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider pb-1.5 border-b border-slate-800">
            <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
            <span>Docentes Asesores del Proyecto</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-blue-300 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Aforo Vial:</span>
              </div>
              <span className="font-bold text-white text-xs bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-700/50">
                Marlyn Aaron
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Aforo Universitario:</span>
              </div>
              <span className="font-bold text-white text-xs bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-700/50">
                Robert Quintero
              </span>
            </div>
          </div>
        </div>

        {/* Barra de progreso de carga estilizada (High-tech) */}
        <div className="w-full flex flex-col items-center gap-2 pt-1">
          <div className="w-48 sm:w-56 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 rounded-full animate-loader-shimmer" />
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Iniciando entorno seguro...</span>
          </div>
        </div>
      </div>

      {/* Pie de página institucional */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-3 max-w-sm gap-1">
        <span>Universidad de La Guajira · Riohacha</span>
        <span className="text-slate-600">v2.5 · Conexión Encriptada</span>
      </div>
    </div>
  );
};
