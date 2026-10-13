import React, { useState } from 'react';
import { History, Building2, Calendar, FileSpreadsheet, Download, Trash2, ArrowRight } from 'lucide-react';
import type { SesionAforoUni, EventoAforoUni, MetricasAforoUni } from '../../types/aforoUniversitario';
import { exportarAforoUniXLSX, exportarAforoUniCSV } from '../../lib/exportAforoUni';

interface HistorialSesionesUniProps {
  sesiones: SesionAforoUni[];
  todosLosEventos: EventoAforoUni[];
  sesionActivaId: string | null;
  onSeleccionarSesion: (sesion: SesionAforoUni) => void;
  onEliminarSesion: (sesionId: string) => void;
}

export const HistorialSesionesUni: React.FC<HistorialSesionesUniProps> = ({
  sesiones,
  todosLosEventos,
  sesionActivaId,
  onSeleccionarSesion,
  onEliminarSesion
}) => {
  const [filtroBloque, setFiltroBloque] = useState<string>('todos');

  const sesionesValidas = sesiones.filter((s) => !s.enPapelera);

  const bloquesUnicos = Array.from(new Set(sesionesValidas.map((s) => s.bloque)));

  const sesionesFiltradas = sesionesValidas.filter((s) => {
    if (filtroBloque !== 'todos' && s.bloque !== filtroBloque) return false;
    return true;
  });

  const calcularMetricasDeSesion = (sesionId: string, aforoInicial = 0): MetricasAforoUni => {
    const evs = todosLosEventos.filter((e) => e.sesionId === sesionId && !e.enPapelera);
    let aforo = aforoInicial;
    let entradas = 0;
    let salidas = 0;
    let pico = aforoInicial;
    let horaPico: string | null = null;
    const entradasPorPuerta: Record<string, number> = {};
    const salidasPorPuerta: Record<string, number> = {};

    evs
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((e) => {
        const p = e.puerta || 'Entrada Frontal';
        if (e.tipo === 'entrada') {
          entradas += e.cantidad;
          aforo += e.cantidad;
          entradasPorPuerta[p] = (entradasPorPuerta[p] || 0) + e.cantidad;
        } else {
          salidas += e.cantidad;
          aforo = Math.max(0, aforo - e.cantidad);
          salidasPorPuerta[p] = (salidasPorPuerta[p] || 0) + e.cantidad;
        }
        if (aforo > pico) {
          pico = aforo;
          horaPico = new Date(e.timestamp).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      });

    return {
      aforoActual: aforo,
      totalEntradas: entradas,
      totalSalidas: salidas,
      volumenTransito: entradas + salidas,
      aforoPico: pico,
      horaPico,
      entradasPorPuerta,
      salidasPorPuerta
    };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Historial de Mediciones de Aforo
            </h3>
            <p className="text-xs text-slate-400">
              Registros históricos de tránsito de personas en bloques universitarios
            </p>
          </div>
        </div>

        {/* Filtro por bloque */}
        {bloquesUnicos.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Filtrar por bloque:</span>
            <select
              value={filtroBloque}
              onChange={(e) => setFiltroBloque(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="todos">Todos los bloques</option>
              {bloquesUnicos.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Lista de sesiones */}
      {sesionesFiltradas.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/60">
          No hay mediciones guardadas en el historial.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sesionesFiltradas.map((s) => {
            const esActiva = s.id === sesionActivaId;
            const metricas = calcularMetricasDeSesion(s.id, s.aforoInicial || 0);
            const evs = todosLosEventos.filter((e) => e.sesionId === s.id && !e.enPapelera);
            const fechaStr = new Date(s.fechaCreacion).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
            const horaStr = new Date(s.fechaCreacion).toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={s.id}
                className={`border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition gap-4 ${
                  esActiva
                    ? 'bg-slate-900 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {esActiva && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        <h4 className="font-bold text-sm sm:text-base text-white truncate">
                          {s.nombre}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-blue-400">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{s.bloque}</span>
                        </span>
                        {s.puertaAcceso && (
                          <span className="text-slate-500">• {s.puertaAcceso}</span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        s.estado === 'abierta' || s.activa
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {s.estado === 'abierta' || s.activa ? 'En curso' : 'Finalizada'}
                    </span>
                  </div>

                  {/* Metadatos de fecha y KPIs */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Fecha y Hora</span>
                      </span>
                      <p className="text-slate-300 font-mono mt-0.5">
                        {fechaStr} <span className="text-slate-500">({horaStr})</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">
                        Aforo Pico Alcanzado
                      </span>
                      <p className="text-amber-400 font-bold font-mono mt-0.5">
                        {metricas.aforoPico} pers. {metricas.horaPico ? `(${metricas.horaPico})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Resumen de conteo */}
                  <div className="mt-3 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Entradas</span>
                      <p className="text-emerald-400 font-bold font-mono">+{metricas.totalEntradas}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Salidas</span>
                      <p className="text-rose-400 font-bold font-mono">-{metricas.totalSalidas}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Volumen</span>
                      <p className="text-blue-400 font-bold font-mono">{metricas.volumenTransito}</p>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/70">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => exportarAforoUniXLSX(s, evs, metricas)}
                      className="touch-btn p-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                      title="Exportar a Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => exportarAforoUniCSV(s, evs)}
                      className="touch-btn p-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                      title="Exportar a CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEliminarSesion(s.id)}
                      className="touch-btn p-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Eliminar sesión"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSeleccionarSesion(s)}
                      className="touch-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <span>{esActiva ? 'Ver en vivo' : 'Ver datos'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
