import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Clock,
  Activity,
  UserPlus,
  UserMinus
} from 'lucide-react';
import type { EventoAforoUni, IntervaloFlujoUni } from '../../types/aforoUniversitario';

interface GraficoFlujoUniProps {
  eventos: EventoAforoUni[];
  aforoInicial?: number;
}

export const GraficoFlujoUni: React.FC<GraficoFlujoUniProps> = ({
  eventos,
  aforoInicial = 0
}) => {
  // Intervalo de agrupación en minutos: 5, 15 o 30
  const [minutosIntervalo, setMinutosIntervalo] = useState<number>(5);
  // Intervalo seleccionado interactivamente (para touch en móviles o click)
  const [indiceSeleccionado, setIndiceSeleccionado] = useState<number | null>(null);

  const eventosValidos = useMemo(() => {
    return eventos
      .filter((e) => !e.enPapelera)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [eventos]);

  // Agrupar eventos por franjas de tiempo
  const intervalos = useMemo(() => {
    if (eventosValidos.length === 0) return [];

    const msIntervalo = minutosIntervalo * 60 * 1000;
    const primerTs = eventosValidos[0].timestamp;
    const ultimoTs = eventosValidos[eventosValidos.length - 1].timestamp;

    // Alinear al inicio del bloque de tiempo
    const inicioAlineado = Math.floor(primerTs / msIntervalo) * msIntervalo;
    const finAlineado = Math.ceil((ultimoTs + 1) / msIntervalo) * msIntervalo;

    const buckets: IntervaloFlujoUni[] = [];
    let aforoAcumulado = aforoInicial;

    for (let t = inicioAlineado; t < finAlineado; t += msIntervalo) {
      const tFin = t + msIntervalo;
      const d = new Date(t);
      const etiquetaHora = d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const eventosEnBucket = eventosValidos.filter(
        (e) => e.timestamp >= t && e.timestamp < tFin
      );

      let entradas = 0;
      let salidas = 0;

      eventosEnBucket.forEach((e) => {
        if (e.tipo === 'entrada') entradas += e.cantidad;
        if (e.tipo === 'salida') salidas += e.cantidad;
      });

      aforoAcumulado = Math.max(0, aforoAcumulado + entradas - salidas);

      buckets.push({
        etiquetaHora,
        timestampInicio: t,
        entradas,
        salidas,
        volumen: entradas + salidas,
        aforoFin: aforoAcumulado
      });
    }

    return buckets;
  }, [eventosValidos, minutosIntervalo, aforoInicial]);

  // Máximo valor para escalar las barras y la línea de aforo
  const maxMovimientos = useMemo(() => {
    let max = 1;
    intervalos.forEach((i) => {
      if (i.entradas > max) max = i.entradas;
      if (i.salidas > max) max = i.salidas;
      if (i.aforoFin > max) max = i.aforoFin;
    });
    return max;
  }, [intervalos]);

  // Telemetría resumen del flujo
  const statsFlujo = useMemo(() => {
    if (intervalos.length === 0) return null;
    let picoVolumen = 0;
    let horaPico = '';
    let sumaVolumen = 0;

    intervalos.forEach((item) => {
      sumaVolumen += item.volumen;
      if (item.volumen > picoVolumen) {
        picoVolumen = item.volumen;
        horaPico = item.etiquetaHora;
      }
    });

    const promedioVolumen = Math.round(sumaVolumen / intervalos.length);
    const aforoFinal = intervalos[intervalos.length - 1].aforoFin;

    return {
      picoVolumen,
      horaPico: horaPico || 'N/A',
      promedioVolumen,
      aforoFinal
    };
  }, [intervalos]);

  if (eventosValidos.length === 0) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-10 text-center text-slate-400 text-xs shadow-xl space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
          <Clock className="w-6 h-6 opacity-70" />
        </div>
        <div>
          <h4 className="font-bold text-slate-200 text-sm">
            Curva de Flujo Horario Pendiente
          </h4>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
            Comienza a registrar entradas o salidas con los controles táctiles para visualizar la distribución temporal de afluencia y aforo acumulado.
          </p>
        </div>
      </div>
    );
  }

  // Intervalo activo a inspeccionar (por defecto el último si ninguno está seleccionado)
  const itemInspeccionado =
    indiceSeleccionado !== null && intervalos[indiceSeleccionado]
      ? intervalos[indiceSeleccionado]
      : intervalos[intervalos.length - 1];

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
      {/* ============================================================ */}
      {/* ENCABEZADO Y SELECTOR DE INTERVALO                           */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Dinámica Temporal del Flujo</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-blue-300 border border-slate-700">
                {intervalos.length} franjas
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Evolución cronológica de ingresos (+), salidas (-) y aforo en el bloque
            </p>
          </div>
        </div>

        {/* Selector de intervalo en minutos */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs self-stretch sm:self-auto justify-end">
          <span className="text-[10px] text-slate-500 px-1 font-bold uppercase tracking-wider">
            Resolución:
          </span>
          {[5, 15, 30].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMinutosIntervalo(m);
                setIndiceSeleccionado(null);
              }}
              className={`touch-btn px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
                minutosIntervalo === m
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TELEMETRÍA SUPERIOR Y LEYENDA DEL GRÁFICO                    */}
      {/* ============================================================ */}
      {statsFlujo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Hora Pico Flujo
            </span>
            <span className="text-sm font-mono font-black text-amber-400">
              {statsFlujo.horaPico}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Pico en Intervalo
            </span>
            <span className="text-sm font-mono font-black text-white">
              {statsFlujo.picoVolumen} movs
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Promedio por Franja
            </span>
            <span className="text-sm font-mono font-black text-slate-200">
              ~{statsFlujo.promedioVolumen} pers
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Aforo Acumulado Fin
            </span>
            <span className="text-sm font-mono font-black text-blue-400">
              {statsFlujo.aforoFinal} pers
            </span>
          </div>
        </div>
      )}

      {/* Leyenda visual */}
      <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2 pt-1">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gradient-to-t from-emerald-600 to-emerald-400 border border-emerald-400/40 shadow-sm shadow-emerald-500/20 shrink-0" />
            <span className="font-semibold text-slate-300 text-[11px]">Ingresos (+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-gradient-to-t from-rose-600 to-rose-400 border border-rose-400/40 shadow-sm shadow-rose-500/20 shrink-0" />
            <span className="font-semibold text-slate-300 text-[11px]">Egresos (-)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-blue-400/40 shrink-0" />
            <span className="font-semibold text-slate-300 text-[11px]">Aforo en Bloque</span>
          </div>
        </div>

        <span className="text-[10px] text-slate-500 italic">
          Toca una barra para inspeccionar detalle
        </span>
      </div>

      {/* ============================================================ */}
      {/* ÁREA GRÁFICA INTERACTIVA CON GRADIENTES REFINADOS            */}
      {/* ============================================================ */}
      <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-3 sm:p-4 overflow-x-auto shadow-inner">
        <div className="min-w-[540px] h-60 flex flex-col justify-between pt-4 pb-1 relative">
          {/* Líneas guía sutiles */}
          <div className="absolute inset-x-0 top-6 border-b border-slate-800/40 border-dashed pointer-events-none" />
          <div className="absolute inset-x-0 top-28 border-b border-slate-800/40 border-dashed pointer-events-none" />
          <div className="absolute inset-x-0 bottom-12 border-b border-slate-800/80 pointer-events-none" />

          {/* Barras verticales */}
          <div className="flex-1 flex items-end gap-3 px-3 relative z-10">
            {intervalos.map((item, idx) => {
              const esActivo =
                indiceSeleccionado === idx ||
                (indiceSeleccionado === null && idx === intervalos.length - 1);

              const hEntrada = (item.entradas / maxMovimientos) * 145;
              const hSalida = (item.salidas / maxMovimientos) * 145;
              const hAforo = (item.aforoFin / maxMovimientos) * 145;

              return (
                <div
                  key={idx}
                  onClick={() => setIndiceSeleccionado(idx)}
                  className={`flex-1 flex flex-col items-center justify-end h-full cursor-pointer group transition-all select-none ${
                    esActivo ? 'opacity-100 scale-[1.02]' : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Contenedor de barras */}
                  <div className="w-full flex items-end justify-center gap-1.5 h-[155px] relative">
                    {/* Barra Entrada con gradiente suave */}
                    <div
                      className={`w-3 sm:w-4 rounded-t-lg transition-all duration-300 border-t border-x ${
                        item.entradas > 0
                          ? 'bg-gradient-to-t from-emerald-950/60 via-emerald-600 to-emerald-400 border-emerald-300/50 shadow-md shadow-emerald-500/20'
                          : 'bg-transparent border-transparent'
                      }`}
                      style={{ height: `${Math.max(hEntrada, item.entradas > 0 ? 6 : 0)}px` }}
                      title={`Ingresos: +${item.entradas}`}
                    />

                    {/* Barra Salida con gradiente suave */}
                    <div
                      className={`w-3 sm:w-4 rounded-t-lg transition-all duration-300 border-t border-x ${
                        item.salidas > 0
                          ? 'bg-gradient-to-t from-rose-950/60 via-rose-600 to-rose-400 border-rose-300/50 shadow-md shadow-rose-500/20'
                          : 'bg-transparent border-transparent'
                      }`}
                      style={{ height: `${Math.max(hSalida, item.salidas > 0 ? 6 : 0)}px` }}
                      title={`Egresos: -${item.salidas}`}
                    />

                    {/* Nodo de Aforo Acumulado */}
                    <div
                      className={`absolute w-2.5 h-2.5 rounded-full transition-all duration-300 -translate-y-1 ${
                        esActivo
                          ? 'bg-white ring-4 ring-blue-500/60 scale-125 z-20'
                          : 'bg-blue-400 ring-2 ring-blue-400/40 z-10'
                      }`}
                      style={{ bottom: `${hAforo}px` }}
                      title={`Aforo acumulado: ${item.aforoFin}`}
                    />
                  </div>

                  {/* Etiqueta de hora inferior */}
                  <div className="mt-2 text-center">
                    <span
                      className={`text-[10px] font-mono block transition-colors ${
                        esActivo
                          ? 'text-white font-bold bg-blue-600/30 px-1.5 py-0.5 rounded-md border border-blue-500/40'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {item.etiquetaHora}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TARJETA DE INSPECCIÓN DEL INTERVALO SELECCIONADO             */}
      {/* ============================================================ */}
      {itemInspeccionado && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Franja Horaria:</span>
                <span className="font-mono text-blue-300 font-black">
                  {itemInspeccionado.etiquetaHora}
                </span>
                <span className="text-[10px] text-slate-500">
                  (+{minutosIntervalo} min)
                </span>
              </span>
              <p className="text-[11px] text-slate-400">
                Ocupación resultante: <strong className="text-white font-mono">{itemInspeccionado.aforoFin} personas</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
              <UserPlus className="w-3.5 h-3.5" />
              <span>+{itemInspeccionado.entradas}</span>
            </div>

            <div className="flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
              <UserMinus className="w-3.5 h-3.5" />
              <span>-{itemInspeccionado.salidas}</span>
            </div>

            <div className="flex items-center gap-1 text-blue-300 font-bold bg-blue-500/10 px-2.5 py-1 rounded-xl border border-blue-500/20">
              <span>Vol: {itemInspeccionado.volumen}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
