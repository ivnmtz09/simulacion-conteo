import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  Activity,
  TrendingUp,
  AlertTriangle,
  DoorOpen,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import type { MetricasAforoUni, SesionAforoUni } from '../../types/aforoUniversitario';
import { obtenerPuertasPorBloque } from '../../types/aforoUniversitario';

interface MetricasAforoCardsProps {
  metricas: MetricasAforoUni;
  sesion: SesionAforoUni;
}

export const MetricasAforoCards: React.FC<MetricasAforoCardsProps> = ({ metricas, sesion }) => {
  const [vistaDistribucion, setVistaDistribucion] = useState<'entradas' | 'salidas'>('entradas');

  const capacidad = sesion.capacidadMaxima;
  const porcentaje =
    capacidad && capacidad > 0 ? Math.round((metricas.aforoActual / capacidad) * 100) : null;
  const puertasBloque = obtenerPuertasPorBloque(sesion.bloque);

  const entradasPorPuerta = metricas.entradasPorPuerta || {};
  const salidasPorPuerta = metricas.salidasPorPuerta || {};

  // Estado dinámico de flujo y ocupación con Obsidian Glass styling
  let estadoColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let orbColor = 'bg-emerald-500/10';
  let estadoTexto = 'Flujo Óptimo';
  let descripcionEstado = 'El bloque se encuentra operando dentro de los parámetros recomendados.';

  if (porcentaje !== null) {
    if (porcentaje >= 95) {
      estadoColor = 'text-rose-400 bg-rose-500/15 border-rose-500/40 shadow-rose-500/20';
      orbColor = 'bg-rose-500/20';
      estadoTexto = 'Aforo Crítico (≥95%)';
      descripcionEstado = 'Capacidad máxima prácticamente alcanzada. Se sugiere regular accesos.';
    } else if (porcentaje >= 85) {
      estadoColor = 'text-orange-400 bg-orange-500/15 border-orange-500/30 shadow-orange-500/20';
      orbColor = 'bg-orange-500/20';
      estadoTexto = 'Ocupación Muy Alta (≥85%)';
      descripcionEstado = 'Alta afluencia de personas en pasillos y aulas.';
    } else if (porcentaje >= 70) {
      estadoColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30 shadow-amber-500/20';
      orbColor = 'bg-amber-500/15';
      estadoTexto = 'Ocupación Moderada (≥70%)';
      descripcionEstado = 'Flujo constante de personas en tránsito.';
    } else {
      estadoColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30 shadow-emerald-500/10';
      orbColor = 'bg-emerald-500/10';
      estadoTexto = 'Capacidad Holgada (<70%)';
      descripcionEstado = 'Disponibilidad óptima de espacio.';
    }
  } else {
    // Si no hay capacidad fijada, clasificar por dinámica de flujo
    if (metricas.totalEntradas > metricas.totalSalidas + 20) {
      estadoColor = 'text-blue-400 bg-blue-500/15 border-blue-500/30 shadow-blue-500/20';
      orbColor = 'bg-blue-500/15';
      estadoTexto = 'Flujo en Crecimiento';
      descripcionEstado = 'La tasa de ingreso supera sensiblemente a los egresos.';
    } else if (metricas.totalSalidas > metricas.totalEntradas + 10) {
      estadoColor = 'text-purple-400 bg-purple-500/15 border-purple-500/30 shadow-purple-500/20';
      orbColor = 'bg-purple-500/15';
      estadoTexto = 'Evacuación / Desalojo';
      descripcionEstado = 'Mayoría de movimientos corresponden a egresos del bloque.';
    } else {
      estadoColor = 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30 shadow-cyan-500/20';
      orbColor = 'bg-cyan-500/10';
      estadoTexto = 'Flujo Continuo Equilibrado';
      descripcionEstado = 'Movimiento activo de entrada y salida sin saturación.';
    }
  }

  // Porcentaje de entradas y salidas sobre el volumen total
  const pctEntradas =
    metricas.volumenTransito > 0
      ? Math.round((metricas.totalEntradas / metricas.volumenTransito) * 100)
      : 50;
  const pctSalidas =
    metricas.volumenTransito > 0
      ? Math.round((metricas.totalSalidas / metricas.volumenTransito) * 100)
      : 50;

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* TARJETA HERO 'OBSIDIAN GLASS': AFORO ACTUAL EN TIEMPO REAL   */}
      {/* ============================================================ */}
      <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-2xl border border-slate-700/50 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden">
        {/* Glow orb dinámico según estado */}
        <div
          className={`absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${orbColor}`}
        />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado Hero */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                Aforo en Tiempo Real • {sesion.bloque}
              </span>
              <span
                className={`text-[11px] font-black px-3 py-0.5 rounded-full border shadow-sm flex items-center gap-1.5 ${estadoColor}`}
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>{estadoTexto}</span>
              </span>
            </div>

            {/* Cifra Gigante Tabular */}
            <div className="flex items-baseline gap-3 sm:gap-4 mt-3">
              <span className="text-5xl sm:text-7xl font-black font-mono tracking-tight tabular-nums text-white drop-shadow-md">
                {metricas.aforoActual}
              </span>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-bold text-slate-200">
                  {metricas.aforoActual === 1 ? 'persona dentro' : 'personas dentro'}
                </span>
                {capacidad && capacidad > 0 && (
                  <span className="text-xs font-mono font-semibold text-slate-400">
                    de {capacidad} capacidad sugerida (
                    <strong className="text-slate-300">
                      {Math.max(0, capacidad - metricas.aforoActual)}
                    </strong>{' '}
                    disponibles)
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
              {descripcionEstado}
            </p>
          </div>

          {/* Badge Visual Iconográfico */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md flex items-center justify-center text-blue-400 shadow-xl shadow-black/40">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-md" />
            </div>
          </div>
        </div>

        {/* Medidor de Ocupación Estilizado si hay capacidad máxima */}
        {porcentaje !== null && capacidad && (
          <div className="relative z-10 mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-400" />
                <span>Nivel de Ocupación del Bloque:</span>
              </span>
              <span className="font-mono font-black text-slate-200 text-sm">
                {porcentaje}%{' '}
                <span className="text-xs text-slate-400 font-normal">
                  ({metricas.aforoActual} / {capacidad})
                </span>
              </span>
            </div>

            {/* Pista Obsidian de la barra */}
            <div className="w-full bg-slate-950/90 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-800 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 relative overflow-hidden ${
                  porcentaje >= 95
                    ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-400 shadow-lg shadow-rose-500/50'
                    : porcentaje >= 70
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 shadow-lg shadow-amber-500/40'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-lg shadow-emerald-500/30'
                }`}
                style={{ width: `${Math.min(porcentaje, 100)}%` }}
              >
                {/* Reflejo animado de la barra */}
                <div className="absolute inset-0 bg-white/20 opacity-40 animate-pulse pointer-events-none" />
              </div>
            </div>

            {/* Banner de alerta en caso de aforo crítico */}
            {porcentaje >= 90 && (
              <div className="flex items-center gap-2 text-xs text-rose-300 mt-3 bg-rose-500/15 border border-rose-500/30 p-2.5 rounded-2xl shadow-md">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 animate-bounce" />
                <span className="font-semibold">
                  Alerta de Aforo: El bloque ha superado el 90% de su capacidad nominal.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* GRID DE KPIS COMPLEMENTARIOS CON ESTÉTICA OBSIDIAN GLASS     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI: ENTRADAS TOTALES */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-black mb-1">
            <span className="uppercase tracking-wider flex items-center gap-1.5">
              <span>Ingresos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-white">
              {metricas.totalEntradas}
            </span>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Personas ingresadas</span>
              <span className="font-mono text-emerald-400 font-bold">{pctEntradas}%</span>
            </div>
          </div>
        </div>

        {/* KPI: SALIDAS TOTALES */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-rose-400 font-black mb-1">
            <span className="uppercase tracking-wider flex items-center gap-1.5">
              <span>Egresos</span>
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
              <UserMinus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-white">
              {metricas.totalSalidas}
            </span>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Personas egresadas</span>
              <span className="font-mono text-rose-400 font-bold">{pctSalidas}%</span>
            </div>
          </div>
        </div>

        {/* KPI: VOLUMEN DE TRÁNSITO */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-blue-400 font-black mb-1">
            <span className="uppercase tracking-wider">Volumen Total</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-white">
              {metricas.volumenTransito}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Tránsito global (In + Out)
            </p>
          </div>
        </div>

        {/* KPI: AFORO PICO */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-xs text-amber-400 font-black mb-1">
            <span className="uppercase tracking-wider">Aforo Pico</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-white">
              {metricas.aforoPico}
            </span>
            <p className="text-[11px] text-slate-400 mt-1 truncate" title={metricas.horaPico || 'N/A'}>
              Hora: <strong className="text-slate-300 font-mono">{metricas.horaPico || 'En curso'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DISTRIBUCIÓN POR PUNTOS DE ACCESO / PUERTAS                  */}
      {/* ============================================================ */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Distribución por Accesos ({sesion.bloque})
              </h3>
              <p className="text-[11px] text-slate-400">
                Punto de tránsito de los registros capturados en este bloque
              </p>
            </div>
          </div>

          {/* Toggle entre Ingresos y Egresos */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setVistaDistribucion('entradas')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                vistaDistribucion === 'entradas'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Ingresos ({metricas.totalEntradas})</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaDistribucion('salidas')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                vistaDistribucion === 'salidas'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Egresos ({metricas.totalSalidas})</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de distribución por puerta */}
        <div
          className={`grid gap-3 ${
            puertasBloque.length > 2 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {puertasBloque.map((p) => {
            const esEntrada = vistaDistribucion === 'entradas';
            const cant = esEntrada ? entradasPorPuerta[p] || 0 : salidasPorPuerta[p] || 0;
            const total = esEntrada ? metricas.totalEntradas : metricas.totalSalidas;
            const pct = total > 0 ? Math.round((cant / total) * 100) : 0;
            const esLateral = p.toLowerCase().includes('lateral');

            return (
              <div
                key={p}
                className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-extrabold text-slate-200 truncate text-xs flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p}</span>
                  </span>
                  {esLateral && (
                    <span className="text-[9px] font-mono uppercase bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                      Lateral
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white">
                    {cant}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      esEntrada ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Micro barra Obsidian de porcentaje estilizada */}
                <div className="w-full bg-slate-900 rounded-full h-2 mt-2.5 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      esEntrada
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-rose-500 to-red-400'
                    }`}
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
