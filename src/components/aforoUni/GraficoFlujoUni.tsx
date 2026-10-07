import React, { useState, useMemo } from 'react';
import { BarChart3, Clock } from 'lucide-react';
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

  // Máximo valor para escalar las barras
  const maxMovimientos = useMemo(() => {
    let max = 1;
    intervalos.forEach((i) => {
      if (i.entradas > max) max = i.entradas;
      if (i.salidas > max) max = i.salidas;
      if (i.aforoFin > max) max = i.aforoFin;
    });
    return max;
  }, [intervalos]);

  if (eventosValidos.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-400 text-xs">
        <Clock className="w-6 h-6 text-slate-500 mx-auto mb-2 opacity-60" />
        <p className="font-semibold text-slate-300">Aún no hay registros para graficar</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          A medida que se registren entradas y salidas en el bloque, aquí verás la curva de flujo y aforo por intervalos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Encabezado y selector de resolución */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Distribución Temporal del Flujo
            </h3>
            <p className="text-[11px] text-slate-400">
              Comparativa de personas ingresando, saliendo y ocupación acumulada
            </p>
          </div>
        </div>

        {/* Selector de intervalo */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs self-stretch sm:self-auto justify-end">
          <span className="text-[10px] text-slate-500 px-1 font-semibold uppercase">Intervalo:</span>
          {[5, 15, 30].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutosIntervalo(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                minutosIntervalo === m
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      {/* Leyenda explicativa */}
      <div className="flex items-center gap-4 text-xs text-slate-400 border-b border-slate-800/80 pb-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
          <span className="font-medium text-slate-300">Entradas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-500 shrink-0" />
          <span className="font-medium text-slate-300">Salidas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-blue-400 shrink-0" />
          <span className="font-medium text-slate-300">Aforo Acumulado</span>
        </div>
      </div>

      {/* Gráfico interactivo horizontal/vertical */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[500px] h-56 flex items-end gap-3 pt-6 px-2">
          {intervalos.map((item, idx) => {
            const hEntrada = (item.entradas / maxMovimientos) * 160;
            const hSalida = (item.salidas / maxMovimientos) * 160;
            const hAforo = (item.aforoFin / maxMovimientos) * 160;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip flotante al pasar el mouse */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-slate-950 border border-slate-700 text-white text-[10px] rounded-lg p-2 shadow-2xl whitespace-nowrap">
                  <p className="font-bold text-slate-200">Hora: {item.etiquetaHora}</p>
                  <p className="text-emerald-400">Entradas: +{item.entradas}</p>
                  <p className="text-rose-400">Salidas: -{item.salidas}</p>
                  <p className="text-blue-400 font-bold">Aforo fin: {item.aforoFin}</p>
                </div>

                {/* Barras y línea */}
                <div className="w-full flex items-end justify-center gap-1 h-[170px] relative">
                  {/* Barra Entrada */}
                  <div
                    className="w-3 sm:w-4 bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
                    style={{ height: `${Math.max(hEntrada, 3)}px` }}
                    title={`Entradas: +${item.entradas}`}
                  />
                  {/* Barra Salida */}
                  <div
                    className="w-3 sm:w-4 bg-rose-500 rounded-t transition-all hover:bg-rose-400"
                    style={{ height: `${Math.max(hSalida, 3)}px` }}
                    title={`Salidas: -${item.salidas}`}
                  />
                  {/* Indicador de aforo acumulado */}
                  <div
                    className="absolute w-2 h-2 rounded-full bg-blue-400 border border-white -translate-y-1 transition-all"
                    style={{ bottom: `${hAforo}px` }}
                    title={`Aforo en bloque: ${item.aforoFin}`}
                  />
                </div>

                {/* Etiqueta de hora */}
                <span className="text-[10px] font-mono text-slate-400 mt-2 truncate max-w-[45px]">
                  {item.etiquetaHora}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
