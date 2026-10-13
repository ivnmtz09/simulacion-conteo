import React, { useState, useMemo } from 'react';
import {
  ListFilter,
  Search,
  Trash2,
  UserPlus,
  UserMinus,
  FileSpreadsheet,
  Download,
  DoorOpen,
  Clock,
  LayoutList,
  Table as TableIcon,
  AlertCircle,
  X
} from 'lucide-react';
import type { EventoAforoUni } from '../../types/aforoUniversitario';

interface BitacoraEventosUniProps {
  eventos: EventoAforoUni[];
  onEliminarEvento: (eventoId: string) => void;
  onExportarXLSX?: () => void;
  onExportarCSV?: () => void;
}

function formatearTiempoRelativo(ts: number): string {
  const diffSeg = Math.floor((Date.now() - ts) / 1000);
  if (diffSeg < 10) return 'justo ahora';
  if (diffSeg < 60) return `hace ${diffSeg}s`;
  const diffMin = Math.floor(diffSeg / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `hace ${diffHoras} h`;
  return new Date(ts).toLocaleDateString('es-CO');
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
  const [modoVista, setModoVista] = useState<'auto' | 'timeline' | 'tabla'>('auto');
  const [confirmarEliminarId, setConfirmarEliminarId] = useState<string | null>(null);

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
        const matchUsuario = e.usuario ? e.usuario.toLowerCase().includes(q) : false;
        return horaStr.includes(q) || matchNota || matchPuerta || matchUsuario;
      }
      return true;
    });
  }, [eventosActivos, filtroTipo, filtroPuerta, busqueda]);

  const totalEntradas = useMemo(
    () => eventosActivos.filter((e) => e.tipo === 'entrada').length,
    [eventosActivos]
  );
  const totalSalidas = useMemo(
    () => eventosActivos.filter((e) => e.tipo === 'salida').length,
    [eventosActivos]
  );

  const handleSolicitarEliminar = (eventoId: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
    } catch {
      // Ignorar si no soporta
    }
    setConfirmarEliminarId(eventoId);
  };

  const handleConfirmarEliminar = (eventoId: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {
      // Ignorar si no soporta
    }
    onEliminarEvento(eventoId);
    setConfirmarEliminarId(null);
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
      {/* ============================================================ */}
      {/* ENCABEZADO Y CONTROLES PRINCIPALES                          */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>Bitácora de Tránsito en Vivo</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-blue-300 border border-slate-700">
                {eventosActivos.length} eventos
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Registro secuencial de ingresos y egresos con sincronización en tiempo real
            </p>
          </div>
        </div>

        {/* Botones de Exportación y Conmutador de Vista */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
          {/* Selector de Vista: Auto / Timeline / Tabla */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setModoVista('timeline')}
              title="Vista de tarjetas en línea de tiempo (ideal móviles)"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                modoVista === 'timeline'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModoVista('tabla')}
              title="Vista de tabla analítica clásica"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                modoVista === 'tabla'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {onExportarXLSX && (
            <button
              type="button"
              onClick={onExportarXLSX}
              className="touch-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition cursor-pointer shadow-sm active:scale-95"
              title="Descargar bitácora en Microsoft Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
          )}

          {onExportarCSV && (
            <button
              type="button"
              onClick={onExportarCSV}
              className="touch-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 transition cursor-pointer shadow-sm active:scale-95"
              title="Descargar datos en CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* FILTROS RÁPIDOS, SELECTOR DE PUERTAS Y BUSCADOR             */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro de Tipo */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                filtroTipo === 'todos'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({eventosActivos.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('entrada')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filtroTipo === 'entrada'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Entradas ({totalEntradas})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('salida')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filtroTipo === 'salida'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Salidas ({totalSalidas})</span>
            </button>
          </div>

          {/* Filtro por puerta */}
          {puertasDisponibles.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800 text-xs">
              <DoorOpen className="w-4 h-4 text-blue-400" />
              <select
                value={filtroPuerta}
                onChange={(e) => setFiltroPuerta(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="todas" className="bg-slate-900 text-white">
                  Todas las puertas
                </option>
                {puertasDisponibles.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-white">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Buscador inteligente */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por hora, puerta, nota..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CUERPO PRINCIPAL: LISTADO ADAPTATIVO O TABLA                */}
      {/* ============================================================ */}
      {eventosFiltrados.length === 0 ? (
        <div className="p-10 text-center text-slate-400 text-xs bg-slate-950/60 rounded-3xl border border-slate-800/80 space-y-2">
          <Clock className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
          <p className="font-bold text-slate-300 text-sm">Sin movimientos registrados</p>
          <p className="text-[11px] text-slate-500">
            No se encontraron eventos coincidentes con los filtros aplicados.
          </p>
        </div>
      ) : (
        <>
          {/* -------------------------------------------------------- */}
          {/* 1. VISTA MÓVIL ADAPTATIVA: TARJETAS TIPO TIMELINE         */}
          {/*    (Se muestra en móviles o si se activa modo 'timeline') */}
          {/* -------------------------------------------------------- */}
          <div
            className={`space-y-2.5 ${
              modoVista === 'tabla'
                ? 'hidden'
                : modoVista === 'timeline'
                ? 'block'
                : 'block md:hidden'
            }`}
          >
            {eventosFiltrados.map((ev) => {
              const esEntrada = ev.tipo === 'entrada';
              const horaExacta = new Date(ev.timestamp).toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              const tiempoRel = formatearTiempoRelativo(ev.timestamp);
              const puertaTexto = ev.puerta || 'Entrada Frontal';
              const esLateral = puertaTexto.toLowerCase().includes('lateral');
              const confirmando = confirmarEliminarId === ev.id;

              return (
                <div
                  key={ev.id}
                  className={`bg-slate-950/80 border rounded-2xl p-3.5 shadow-md transition-all ${
                    esEntrada
                      ? 'border-emerald-500/20 hover:border-emerald-500/40'
                      : 'border-rose-500/20 hover:border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {/* Timestamp y Relativo */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200 text-xs">
                        {horaExacta}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        ({tiempoRel})
                      </span>
                      {ev.esManual && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Ajuste
                        </span>
                      )}
                    </div>

                    {/* Badge de Movimiento */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                        esEntrada
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {esEntrada ? (
                        <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <UserMinus className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>
                        {esEntrada ? `+${ev.cantidad}` : `-${ev.cantidad}`}{' '}
                        {esEntrada ? 'ENTRADA' : 'SALIDA'}
                      </span>
                    </span>
                  </div>

                  {/* Fila intermedia: Puerta, Aforo resultante y Acción */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Pastilla de Puerta */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          esLateral
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        <DoorOpen className="w-3.5 h-3.5 opacity-70" />
                        <span>{puertaTexto.replace('Entrada ', '')}</span>
                      </span>

                      {/* Aforo en el momento */}
                      <div className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <span>Aforo:</span>
                        <strong className="text-white font-bold bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                          {ev.aforoMomento}
                        </strong>
                      </div>
                    </div>

                    {/* Botón de acción rápida para anular con protección */}
                    <div>
                      {confirmando ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                          <button
                            type="button"
                            onClick={() => handleConfirmarEliminar(ev.id)}
                            className="touch-btn px-2.5 py-1 rounded-xl text-[11px] font-black bg-rose-600 text-white shadow-md shadow-rose-600/30 cursor-pointer"
                          >
                            Confirmar Anulación
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmarEliminarId(null)}
                            className="px-2 py-1 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-900 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSolicitarEliminar(ev.id)}
                          className="touch-btn p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                          title="Anular y revertir este movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Anular</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nota o usuario */}
                  {ev.nota && (
                    <div className="mt-2 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{ev.nota}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* -------------------------------------------------------- */}
          {/* 2. VISTA DESKTOP: TABLA CLÁSICA LIMPIA                    */}
          {/*    (Se muestra en desktop o si se activa modo 'tabla')    */}
          {/* -------------------------------------------------------- */}
          <div
            className={`overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950/70 shadow-inner ${
              modoVista === 'timeline'
                ? 'hidden'
                : modoVista === 'tabla'
                ? 'block'
                : 'hidden md:block'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/95 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Hora</th>
                  <th className="py-3 px-4">Tipo Movimiento</th>
                  <th className="py-3 px-4">Punto de Acceso</th>
                  <th className="py-3 px-4 text-center">Cantidad</th>
                  <th className="py-3 px-4 text-center">Aforo Resultante</th>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4 text-right">Acción</th>
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
                  const confirmando = confirmarEliminarId === ev.id;

                  return (
                    <tr key={ev.id} className="hover:bg-slate-800/40 transition">
                      {/* Hora */}
                      <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold">{horaStr}</span>
                          <span className="text-[10px] text-slate-500 font-sans">
                            {formatearTiempoRelativo(ev.timestamp)}
                          </span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            esEntrada
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {esEntrada ? (
                            <UserPlus className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <UserMinus className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{esEntrada ? 'ENTRADA' : 'SALIDA'}</span>
                        </span>
                      </td>

                      {/* Puerta */}
                      <td className="py-2.5 px-4 font-sans">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                            esLateral
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-slate-900 text-slate-300 border-slate-800'
                          }`}
                        >
                          <DoorOpen className="w-3.5 h-3.5 opacity-70" />
                          <span>{puertaTexto}</span>
                        </span>
                      </td>

                      {/* Cantidad */}
                      <td className="py-2.5 px-4 text-center font-bold text-sm">
                        <span className={esEntrada ? 'text-emerald-400' : 'text-rose-400'}>
                          {esEntrada ? `+${ev.cantidad}` : `-${ev.cantidad}`}
                        </span>
                      </td>

                      {/* Aforo en bloque */}
                      <td className="py-2.5 px-4 text-center">
                        <span className="font-bold text-slate-100 bg-slate-900 px-3 py-1 rounded-xl border border-slate-700/80 shadow-sm">
                          {ev.aforoMomento}
                        </span>
                      </td>

                      {/* Usuario */}
                      <td className="py-2.5 px-4 font-sans text-slate-400 text-[11px] truncate max-w-[130px]">
                        {ev.usuario ? ev.usuario.split('@')[0] : 'N/A'}
                      </td>

                      {/* Acción */}
                      <td className="py-2.5 px-4 text-right">
                        {confirmando ? (
                          <div className="inline-flex items-center gap-1 font-sans">
                            <button
                              type="button"
                              onClick={() => handleConfirmarEliminar(ev.id)}
                              className="touch-btn px-2 py-1 rounded-lg text-[10px] font-black bg-rose-600 text-white shadow-sm cursor-pointer"
                            >
                              Anular
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmarEliminarId(null)}
                              className="px-1.5 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSolicitarEliminar(ev.id)}
                            className="touch-btn text-slate-400 hover:text-rose-400 p-1.5 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
                            title="Anular y revertir este movimiento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
