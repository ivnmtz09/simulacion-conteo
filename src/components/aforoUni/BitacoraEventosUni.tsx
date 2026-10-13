import React, { useState, useMemo } from 'react';
import { ListFilter, Search, Trash2, UserPlus, UserMinus, FileSpreadsheet, Download, DoorOpen } from 'lucide-react';
import type { EventoAforoUni } from '../../types/aforoUniversitario';

interface BitacoraEventosUniProps {
  eventos: EventoAforoUni[];
  onEliminarEvento: (eventoId: string) => void;
  onExportarXLSX?: () => void;
  onExportarCSV?: () => void;
}

export const BitacoraEventosUni: React.FC<BitacoraEventosUniProps> = ({
  eventos,
  onEliminarEvento,
  onExportarXLSX,
  onExportarCSV
}) => {
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'salida'>('todos');
  const [filtroPuerta, setFiltroPuerta] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState('');

  const eventosActivos = useMemo(() => {
    return eventos
      .filter((e) => !e.enPapelera)
      .sort((a, b) => b.timestamp - a.timestamp); // Más recientes primero
  }, [eventos]);

  const puertasDisponibles = useMemo(() => {
    const setP = new Set<string>();
    eventosActivos.forEach((e) => {
      if (e.puerta) setP.add(e.puerta);
    });
    return Array.from(setP);
  }, [eventosActivos]);

  const eventosFiltrados = useMemo(() => {
    return eventosActivos.filter((e) => {
      if (filtroTipo !== 'todos' && e.tipo !== filtroTipo) return false;
      if (filtroPuerta !== 'todas' && (e.puerta || 'Entrada Frontal') !== filtroPuerta) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const horaStr = new Date(e.timestamp).toLocaleTimeString('es-CO');
        const matchNota = e.nota ? e.nota.toLowerCase().includes(q) : false;
        const matchPuerta = e.puerta ? e.puerta.toLowerCase().includes(q) : false;
        return horaStr.includes(q) || matchNota || matchPuerta;
      }
      return true;
    });
  }, [eventosActivos, filtroTipo, filtroPuerta, busqueda]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Barra de título y controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ListFilter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Bitácora de Tránsito en Vivo
            </h3>
            <p className="text-[11px] text-slate-400">
              {eventosActivos.length} {eventosActivos.length === 1 ? 'registro' : 'registros'} capturados
            </p>
          </div>
        </div>

        {/* Botones de exportación */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {onExportarXLSX && (
            <button
              type="button"
              onClick={onExportarXLSX}
              className="touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition cursor-pointer"
              title="Descargar reporte oficial en formato Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
          )}
          {onExportarCSV && (
            <button
              type="button"
              onClick={onExportarCSV}
              className="touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition cursor-pointer"
              title="Descargar datos crudos en CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros rápidos, filtro por puerta y buscador */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filtroTipo === 'todos'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({eventosActivos.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('entrada')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                filtroTipo === 'entrada'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <UserPlus className="w-3 h-3" />
              <span>Entradas</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('salida')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                filtroTipo === 'salida'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <UserMinus className="w-3 h-3" />
              <span>Salidas</span>
            </button>
          </div>

          {/* Filtro por puerta */}
          {puertasDisponibles.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-xs">
              <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filtroPuerta}
                onChange={(e) => setFiltroPuerta(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="todas" className="bg-slate-900 text-white">Todas las puertas</option>
                {puertasDisponibles.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-white">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por hora o puerta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabla de registros */}
      {eventosFiltrados.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/50 rounded-2xl border border-slate-800/60">
          No se encontraron registros que coincidan con los criterios.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Hora</th>
                <th className="py-2.5 px-3">Movimiento</th>
                <th className="py-2.5 px-3">Punto de Acceso</th>
                <th className="py-2.5 px-3 text-center">Cantidad</th>
                <th className="py-2.5 px-3 text-center">Aforo en bloque</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {eventosFiltrados.map((ev) => {
                const esEntrada = ev.tipo === 'entrada';
                const horaStr = new Date(ev.timestamp).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
                const puertaTexto = ev.puerta || 'Entrada Frontal';
                const esLateral = puertaTexto.toLowerCase().includes('lateral');

                return (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                      {horaStr}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          esEntrada
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {esEntrada ? (
                          <>
                            <UserPlus className="w-3 h-3 shrink-0" />
                            <span>ENTRADA</span>
                          </>
                        ) : (
                          <>
                            <UserMinus className="w-3 h-3 shrink-0" />
                            <span>SALIDA</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          esLateral
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700/60'
                        }`}
                      >
                        <DoorOpen className="w-3 h-3 opacity-70" />
                        <span>{puertaTexto}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-bold">
                      <span className={esEntrada ? 'text-emerald-400' : 'text-rose-400'}>
                        {esEntrada ? `+${ev.cantidad}` : `-${ev.cantidad}`}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="font-bold text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
                        {ev.aforoMomento}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onEliminarEvento(ev.id)}
                        className="touch-btn text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                        title="Eliminar este registro y ajustar aforo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
