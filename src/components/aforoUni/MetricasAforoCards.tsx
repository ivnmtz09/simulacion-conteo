import React from 'react';
import { Users, UserPlus, UserMinus, Activity, TrendingUp, AlertTriangle, DoorOpen } from 'lucide-react';
import type { MetricasAforoUni, SesionAforoUni } from '../../types/aforoUniversitario';
import { obtenerPuertasPorBloque } from '../../types/aforoUniversitario';

interface MetricasAforoCardsProps {
  metricas: MetricasAforoUni;
  sesion: SesionAforoUni;
}

export const MetricasAforoCards: React.FC<MetricasAforoCardsProps> = ({ metricas, sesion }) => {
  const capacidad = sesion.capacidadMaxima;
  const porcentaje = capacidad && capacidad > 0 ? Math.round((metricas.aforoActual / capacidad) * 100) : null;
  const puertasBloque = obtenerPuertasPorBloque(sesion.bloque);
  const entradasPorPuerta = metricas.entradasPorPuerta || {};

  // Estado del aforo respecto a la capacidad
  let estadoAforoColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  let estadoTexto = 'En curso';
  if (porcentaje !== null) {
    if (porcentaje >= 90) {
      estadoAforoColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse';
      estadoTexto = 'Aforo Crítico (≥90%)';
    } else if (porcentaje >= 70) {
      estadoAforoColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      estadoTexto = 'Ocupación Alta (≥70%)';
    } else {
      estadoAforoColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      estadoTexto = 'Capacidad Óptima';
    }
  }

  return (
    <div className="space-y-3.5">
      {/* TARJETA HERO: AFORO ACTUAL */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Aforo en Tiempo Real en {sesion.bloque}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${estadoAforoColor}`}>
                {estadoTexto}
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white">
                {metricas.aforoActual}
              </span>
              <span className="text-sm sm:text-base font-semibold text-slate-400">
                {metricas.aforoActual === 1 ? 'persona adentro' : 'personas adentro'}
              </span>
              {capacidad && (
                <span className="text-xs sm:text-sm font-mono text-slate-500">
                  / {capacidad} máx.
                </span>
              )}
            </div>
          </div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-lg shadow-blue-500/10">
            <Users className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
        </div>

        {/* Barra de progreso de ocupación si hay capacidad definida */}
        {porcentaje !== null && capacidad && (
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Nivel de ocupación:</span>
              <span className="font-mono font-bold text-slate-200">
                {porcentaje}% ({metricas.aforoActual}/{capacidad})
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  porcentaje >= 90
                    ? 'bg-rose-500'
                    : porcentaje >= 70
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(porcentaje, 100)}%` }}
              />
            </div>
            {porcentaje >= 90 && (
              <div className="flex items-center gap-1.5 text-xs text-rose-300 mt-2 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Atención: El bloque está al {porcentaje}% de su capacidad máxima recomendada.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GRID DE KPIS COMPLEMENTARIOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* ENTRADAS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
            <span className="uppercase tracking-wider">Entradas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <UserPlus className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              {metricas.totalEntradas}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Personas ingresadas</p>
          </div>
        </div>

        {/* SALIDAS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-rose-400 font-bold mb-1">
            <span className="uppercase tracking-wider">Salidas</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <UserMinus className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              {metricas.totalSalidas}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Personas egresadas</p>
          </div>
        </div>

        {/* VOLUMEN TOTAL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-blue-400 font-bold mb-1">
            <span className="uppercase tracking-wider">Volumen Tránsito</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              {metricas.volumenTransito}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Flujo total de personas</p>
          </div>
        </div>

        {/* AFORO PICO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
            <span className="uppercase tracking-wider">Aforo Pico</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white">
              {metricas.aforoPico}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={metricas.horaPico || 'N/A'}>
              Pico: {metricas.horaPico || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* DISCRIMINACIÓN DE INGRESOS POR PUNTO DE ACCESO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Distribución de Ingresos por Puerta ({sesion.bloque})
              </h3>
              <p className="text-[11px] text-slate-400">
                Punto de origen de los ingresos contabilizados en este bloque
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
            {metricas.totalEntradas} ingresos totales
          </span>
        </div>

        <div className={`grid gap-2.5 ${puertasBloque.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
          {puertasBloque.map((p) => {
            const cant = entradasPorPuerta[p] || 0;
            const pct = metricas.totalEntradas > 0 ? Math.round((cant / metricas.totalEntradas) * 100) : 0;
            const esLateral = p.toLowerCase().includes('lateral');

            return (
              <div
                key={p}
                className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-300 truncate text-[11px]">
                    {p}
                  </span>
                  {esLateral && (
                    <span className="text-[9px] font-mono uppercase bg-amber-500/10 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/20">
                      Lateral
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-white">
                    {cant}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {pct}%
                  </span>
                </div>

                {/* Micro barra de proporción */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
