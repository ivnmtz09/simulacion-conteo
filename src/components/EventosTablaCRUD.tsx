import React, { useState } from 'react';
import {
  ListFilter,
  CirclePlus,
  SquarePen,
  Trash2,
  Search,
  Timer,
  CheckCircle2,
  TriangleAlert,
  X,
  Save,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import type {
  EventoConteo,
  SesionConteo,
  TipoVehiculo,
  MovimientoGiro,
  TipoRegistroEvento
} from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';
import { db, doc, updateDoc, addDoc, collection } from '../lib/firebase';

interface EventosTablaCRUDProps {
  sesion: SesionConteo;
  usuarioActual: string;
  eventos: EventoConteo[];
  onActualizarEventosLocalmente?: (eventos: EventoConteo[]) => void;
  onExportarXLSX?: () => void;
  onExportarCSV?: () => void;
}

export const EventosTablaCRUD: React.FC<EventosTablaCRUDProps> = ({
  sesion,
  usuarioActual,
  eventos,
  onExportarXLSX,
  onExportarCSV
}) => {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [eventoEditando, setEventoEditando] = useState<EventoConteo | null>(null);
  const [modalManualAbierto, setModalManualAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [idEliminando, setIdEliminando] = useState<string | null>(null);

  // Form State para Edición / Creación Manual
  const [formTipoVehiculo, setFormTipoVehiculo] = useState<TipoVehiculo>('carro');
  const [formTipoRegistro, setFormTipoRegistro] = useState<TipoRegistroEvento>('salida_cola');
  const [formCategoriaSalida, setFormCategoriaSalida] = useState<string>('respeta');
  const [formFaseCruce, setFormFaseCruce] = useState<string>('verde');
  const [formMovimiento, setFormMovimiento] = useState<MovimientoGiro>('recto');
  const [formHoraEntrada, setFormHoraEntrada] = useState<string>('');
  const [formHoraLlegaServidor, setFormHoraLlegaServidor] = useState<string>('');
  const [formHoraSalida, setFormHoraSalida] = useState<string>('');
  const [formTiempoEnColaSeg, setFormTiempoEnColaSeg] = useState<number>(0);
  const [formTiempoEnServidorSeg, setFormTiempoEnServidorSeg] = useState<number>(0);
  const [formTiempoTotalSeg, setFormTiempoTotalSeg] = useState<number>(0);

  // Formateador de fecha/hora para inputs tipo datetime-local
  const toInputDateTime = (isoString?: string | null): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 19);
  };

  const formatHoraCorta = (isoOrTimestamp?: string | number | null): string => {
    if (!isoOrTimestamp) return '-';
    const d = new Date(isoOrTimestamp);
    if (isNaN(d.getTime())) return String(isoOrTimestamp);
    return d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Recalcular los tres tiempos derivados automáticamente cuando cambian las horas
  const recalcularTiempos = (entradaStr: string, servidorStr: string, salidaStr: string) => {
    const tEntrada = entradaStr ? new Date(entradaStr).getTime() : NaN;
    const tServidor = servidorStr ? new Date(servidorStr).getTime() : NaN;
    const tSalida = salidaStr ? new Date(salidaStr).getTime() : NaN;

    let colaSeg = 0;
    let servidorSeg = 0;
    let totalSeg = 0;

    if (!isNaN(tEntrada) && !isNaN(tServidor)) {
      colaSeg = Math.max(0, Math.round((tServidor - tEntrada) / 1000));
    }
    if (!isNaN(tServidor) && !isNaN(tSalida)) {
      servidorSeg = Math.max(0, Math.round((tSalida - tServidor) / 1000));
    }
    if (!isNaN(tEntrada) && !isNaN(tSalida)) {
      totalSeg = Math.max(0, Math.round((tSalida - tEntrada) / 1000));
    } else {
      totalSeg = colaSeg + servidorSeg;
    }

    setFormTiempoEnColaSeg(colaSeg);
    setFormTiempoEnServidorSeg(servidorSeg);
    setFormTiempoTotalSeg(totalSeg);
  };

  // Iniciar modal de edición
  const abrirEditar = (ev: EventoConteo) => {
    setEventoEditando(ev);
    setFormTipoVehiculo(ev.tipoVehiculo);
    setFormTipoRegistro(ev.tipoRegistro);
    setFormCategoriaSalida(ev.categoriaSalida || 'respeta');
    setFormFaseCruce(ev.faseCruce || (ev.categoriaSalida === 'se_vuela' ? 'rojo' : 'verde'));
    setFormMovimiento(ev.movimiento || 'recto');
    const entradaIso = ev.horaEntradaCola || new Date(ev.timestampCreacion).toISOString();
    const servidorIso = ev.horaLlegaServidor || entradaIso;
    const salidaIso = ev.horaSalida || new Date(ev.timestampCreacion).toISOString();
    setFormHoraEntrada(toInputDateTime(entradaIso));
    setFormHoraLlegaServidor(toInputDateTime(servidorIso));
    setFormHoraSalida(toInputDateTime(salidaIso));

    const tCola = ev.tiempoEnColaSeg ?? 0;
    const tServ = ev.tiempoEnServidorSeg ?? 0;
    const tTotal = ev.tiempoTotalSeg ?? ev.duracionEsperaSeg ?? (tCola + tServ);
    setFormTiempoEnColaSeg(tCola);
    setFormTiempoEnServidorSeg(tServ);
    setFormTiempoTotalSeg(tTotal);
  };

  // Iniciar modal de creación manual
  const abrirCreacionManual = () => {
    const ahoraIso = new Date().toISOString();
    setEventoEditando(null);
    setFormTipoVehiculo('carro');
    setFormTipoRegistro('salida_cola');
    setFormCategoriaSalida('respeta');
    setFormFaseCruce('verde');
    setFormMovimiento('recto');
    setFormHoraEntrada(toInputDateTime(ahoraIso));
    setFormHoraLlegaServidor(toInputDateTime(ahoraIso));
    setFormHoraSalida(toInputDateTime(ahoraIso));
    setFormTiempoEnColaSeg(0);
    setFormTiempoEnServidorSeg(0);
    setFormTiempoTotalSeg(0);
    setModalManualAbierto(true);
  };

  // Guardar edición
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoEditando) return;
    setGuardando(true);

    try {
      const entradaIso = formHoraEntrada ? new Date(formHoraEntrada).toISOString() : null;
      const servidorIso = formHoraLlegaServidor ? new Date(formHoraLlegaServidor).toISOString() : null;
      const salidaIso = formHoraSalida ? new Date(formHoraSalida).toISOString() : null;

      const datosActualizados: Partial<EventoConteo> = {
        tipoVehiculo: formTipoVehiculo,
        tipoRegistro: formTipoRegistro,
        categoriaSalida: (formTipoRegistro === 'salida_cola' || formTipoRegistro === 'peaton' ? formCategoriaSalida : null) as any,
        faseCruce: formTipoRegistro === 'salida_cola' ? (formFaseCruce as any) : null,
        movimiento: formTipoRegistro === 'movimiento' ? formMovimiento : null,
        horaEntradaCola: formTipoRegistro === 'salida_cola' ? entradaIso : null,
        horaLlegaServidor: formTipoRegistro === 'salida_cola' ? servidorIso : null,
        horaSalida: formTipoRegistro === 'salida_cola' ? salidaIso : null,
        tiempoEnColaSeg: formTipoRegistro === 'salida_cola' ? formTiempoEnColaSeg : null,
        tiempoEnServidorSeg: formTipoRegistro === 'salida_cola' ? formTiempoEnServidorSeg : null,
        tiempoTotalSeg: formTipoRegistro === 'salida_cola' ? formTiempoTotalSeg : null,
        duracionEsperaSeg: formTipoRegistro === 'salida_cola' ? formTiempoTotalSeg : null
      };

      const docRef = doc(db, 'eventos', eventoEditando.id);
      await updateDoc(docRef, datosActualizados);

      setEventoEditando(null);
    } catch (err) {
      console.error('Error al actualizar evento:', err);
      alert('Error al guardar cambios en Firestore. Si estás offline, se aplicará al sincronizar.');
      setEventoEditando(null);
    } finally {
      setGuardando(false);
    }
  };

  // Guardar nuevo evento manual
  const handleGuardarManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const entradaIso = formHoraEntrada ? new Date(formHoraEntrada).toISOString() : null;
      const servidorIso = formHoraLlegaServidor ? new Date(formHoraLlegaServidor).toISOString() : null;
      const salidaIso = formHoraSalida ? new Date(formHoraSalida).toISOString() : null;
      const ahoraMs = Date.now();

      const nuevoEventoData: Omit<EventoConteo, 'id'> = {
        sesionId: sesion.id,
        usuario: usuarioActual,
        tipoVehiculo: formTipoVehiculo,
        tipoRegistro: formTipoRegistro,
        categoriaSalida: (formTipoRegistro === 'salida_cola' || formTipoRegistro === 'peaton' ? formCategoriaSalida : null) as any,
        faseCruce: formTipoRegistro === 'salida_cola' ? (formFaseCruce as any) : null,
        movimiento: formTipoRegistro === 'movimiento' ? formMovimiento : null,
        horaEntradaCola: formTipoRegistro === 'salida_cola' ? entradaIso : null,
        horaLlegaServidor: formTipoRegistro === 'salida_cola' ? servidorIso : null,
        horaSalida: formTipoRegistro === 'salida_cola' ? salidaIso : null,
        tiempoEnColaSeg: formTipoRegistro === 'salida_cola' ? formTiempoEnColaSeg : null,
        tiempoEnServidorSeg: formTipoRegistro === 'salida_cola' ? formTiempoEnServidorSeg : null,
        tiempoTotalSeg: formTipoRegistro === 'salida_cola' ? formTiempoTotalSeg : null,
        duracionEsperaSeg: formTipoRegistro === 'salida_cola' ? formTiempoTotalSeg : null,
        timestampCreacion: salidaIso ? new Date(salidaIso).getTime() : ahoraMs,
        esManual: true
      };

      await addDoc(collection(db, 'eventos'), nuevoEventoData);
      setModalManualAbierto(false);
    } catch (err) {
      console.error('Error al agregar evento manual:', err);
      alert('Error al crear evento en Firestore.');
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar evento (soft delete)
  const handleEliminarEvento = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este evento? Se descontará de los contadores.')) {
      return;
    }
    setIdEliminando(id);
    try {
      await updateDoc(doc(db, 'eventos', id), { enPapelera: true });
    } catch (err) {
      console.error('Error al eliminar evento:', err);
      alert('Error al eliminar evento en Firestore.');
    } finally {
      setIdEliminando(null);
    }
  };

  // Filtros (excluyendo papelera)
  const eventosFiltrados = eventos
    .filter((e) => {
      if (e.enPapelera) return false;
      if (filtroTipo !== 'todos' && e.tipoVehiculo !== filtroTipo) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const info = TIPOS_VEHICULOS[e.tipoVehiculo]?.nombre.toLowerCase() || '';
        const cat = (e.categoriaSalida || '').toLowerCase();
        const usr = (e.usuario || '').toLowerCase();
        if (!info.includes(q) && !cat.includes(q) && !usr.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => b.timestampCreacion - a.timestampCreacion);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Encabezado y barra de herramientas */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Eventos de la Sesión
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {eventos.length} registrados
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Bitácora en tiempo real. Puedes editar entradas/salidas, eliminar errores o añadir eventos manuales.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onExportarXLSX && (
            <button
              onClick={onExportarXLSX}
              title="Exportar reporte XLSX"
              className="touch-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>XLSX</span>
            </button>
          )}
          {onExportarCSV && (
            <button
              onClick={onExportarCSV}
              title="Exportar CSV crudo"
              className="touch-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
          )}
          <button
            onClick={abrirCreacionManual}
            className="touch-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition whitespace-nowrap"
          >
            <CirclePlus className="w-4 h-4 shrink-0" />
            <span>+ Manual</span>
          </button>
        </div>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFiltroTipo('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filtroTipo === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos ({eventos.length})
          </button>
          {LISTA_TIPOS_VEHICULOS.map((tipo) => {
            const count = eventos.filter((e) => e.tipoVehiculo === tipo).length;
            const info = TIPOS_VEHICULOS[tipo];
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
                  filtroTipo === tipo
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-sm select-none">{info.emoji}</span>
                <span className={filtroTipo === tipo ? 'text-white' : info.color}>
                  {info.nombre}
                </span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por usuario, categoría..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabla de Eventos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {eventosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <ListFilter className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No se encontraron eventos registrados con este criterio.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 uppercase tracking-wider text-[11px] text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Hora</th>
                  <th className="py-3 px-3 sm:px-4">Tipo</th>
                  <th className="py-3 px-3 sm:px-4">Comportamiento / Acción</th>
                  <th className="py-3 px-3 sm:px-4">Tiempos (Cola / Semáf / Total)</th>
                  <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Tramos Horarios</th>
                  <th className="py-3 px-3 sm:px-4 hidden lg:table-cell">Usuario</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {eventosFiltrados.map((ev) => {
                  const infoVehiculo = TIPOS_VEHICULOS[ev.tipoVehiculo];

                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Hora */}
                      <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap font-mono text-slate-400">
                        {formatHoraCorta(ev.timestampCreacion)}
                        {ev.esManual && (
                          <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold">
                            Manual
                          </span>
                        )}
                      </td>

                      {/* Tipo de vehículo */}
                      <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-bold ${infoVehiculo?.color}`}>
                          <span className="text-base select-none">{infoVehiculo?.emoji}</span>
                          <span>{infoVehiculo?.nombre || ev.tipoVehiculo}</span>
                        </span>
                      </td>

                      {/* Categoría / Acción */}
                      <td className="py-2.5 px-3 sm:px-4">
                        {ev.tipoRegistro === 'salida_cola' ? (
                          <div className="flex flex-col gap-1 items-start">
                            {ev.faseCruce === 'verde' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 🟢 Verde ({ev.segundoEnCiclo !== null && ev.segundoEnCiclo !== undefined ? `${ev.segundoEnCiclo}s` : 'respeta'})
                              </span>
                            ) : ev.faseCruce === 'amarillo' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                                <TriangleAlert className="w-3.5 h-3.5 text-amber-400" /> 🟡 Amarillo ({ev.segundoEnCiclo !== null && ev.segundoEnCiclo !== undefined ? `${ev.segundoEnCiclo}s` : 'respeta'})
                              </span>
                            ) : ev.faseCruce === 'rojo' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                                <TriangleAlert className="w-3.5 h-3.5" /> 🔴 Rojo ({ev.segundoEnCiclo !== null && ev.segundoEnCiclo !== undefined ? `${ev.segundoEnCiclo}s` : 'se vuela'})
                              </span>
                            ) : ev.categoriaSalida === 'respeta' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Cruza verde (respeta)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                                <TriangleAlert className="w-3.5 h-3.5" /> Cruza rojo (se vuela)
                              </span>
                            )}
                            {ev.esFlujoLibre && (
                              <span className="text-[10px] text-amber-400 font-mono">⚡ Flujo libre</span>
                            )}
                          </div>
                        ) : ev.tipoRegistro === 'entrada_cola' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                            Entra a la cola
                          </span>
                        ) : ev.tipoRegistro === 'llega_servidor' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                            Pasa al semáforo ({ev.tiempoEnColaSeg ?? 0}s fila)
                          </span>
                        ) : ev.tipoRegistro === 'movimiento' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold">
                            Giro: {ev.movimiento?.toUpperCase()}
                          </span>
                        ) : ev.tipoRegistro === 'parqueo_inicia' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold">
                            <span>🅿️</span> Inicia parqueo en carril
                          </span>
                        ) : ev.tipoRegistro === 'parqueo_termina' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                            <span>✅</span> Fin parqueo (Reanuda)
                          </span>
                        ) : (
                          // Peatón
                          ev.categoriaSalida === 'cebra' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 font-semibold">
                              <span>🦓</span> Por cebra
                            </span>
                          ) : ev.categoriaSalida === 'fuera_cebra' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 font-semibold">
                              <TriangleAlert className="w-3.5 h-3.5 text-amber-400" /> Fuera de cebra
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-700 text-slate-300 font-semibold">
                              Por andén
                            </span>
                          )
                        )}
                      </td>

                      {/* Duración Espera Desglosada */}
                      <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap font-mono text-xs">
                        {ev.tipoRegistro === 'salida_cola' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-slate-300">
                              Cola: <strong className="text-amber-300">{ev.tiempoEnColaSeg ?? 0}s</strong> | Semáf: <strong className="text-cyan-300">{ev.tiempoEnServidorSeg ?? 0}s</strong>
                            </span>
                            <span className="font-bold text-emerald-400 text-xs">
                              Total: {ev.tiempoTotalSeg ?? ev.duracionEsperaSeg ?? 0}s
                            </span>
                          </div>
                        ) : ev.tipoRegistro === 'llega_servidor' ? (
                          <span className="text-cyan-300">Fila: {ev.tiempoEnColaSeg ?? 0}s</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Detalle Entrada / Servidor / Salida */}
                      <td className="py-2.5 px-3 sm:px-4 hidden md:table-cell whitespace-nowrap text-slate-400 font-mono text-[10px]">
                        {ev.tipoRegistro === 'salida_cola' && ev.horaEntradaCola ? (
                          <div className="flex flex-col gap-0.5 text-slate-300">
                            <span>Entrada: {formatHoraCorta(ev.horaEntradaCola)}</span>
                            <span>Semáf: {formatHoraCorta(ev.horaLlegaServidor || ev.horaEntradaCola)}</span>
                            <span>Salida: {formatHoraCorta(ev.horaSalida)}</span>
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>

                      {/* Usuario */}
                      <td className="py-2.5 px-3 sm:px-4 hidden lg:table-cell whitespace-nowrap text-slate-400 truncate max-w-[150px]">
                        {ev.usuario}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirEditar(ev)}
                            title="Editar evento"
                            className="touch-btn p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <SquarePen className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idEliminando === ev.id}
                            onClick={() => handleEliminarEvento(ev.id)}
                            title="Eliminar evento"
                            className="touch-btn p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 disabled:opacity-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN O CREACIÓN MANUAL */}
      {(eventoEditando || modalManualAbierto) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative my-6">
            <button
              onClick={() => {
                setEventoEditando(null);
                setModalManualAbierto(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {eventoEditando ? 'Editar Evento de Aforo' : 'Registrar Evento Manual'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {eventoEditando
                ? 'Modifica los campos necesarios; la duración de espera se recalculará automáticamente.'
                : 'Ingresa un evento omitido durante la toma en campo con sus tiempos exactos.'}
            </p>

            <form
              onSubmit={eventoEditando ? handleGuardarEdicion : handleGuardarManual}
              className="space-y-3.5 text-xs"
            >
              {/* Tipo de vehículo */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Tipo de Vehículo
                </label>
                <select
                  value={formTipoVehiculo}
                  onChange={(e) => {
                    const t = e.target.value as TipoVehiculo;
                    setFormTipoVehiculo(t);
                    if (t === 'peaton') {
                      setFormTipoRegistro('peaton');
                      setFormCategoriaSalida('cebra');
                    } else if (formTipoRegistro === 'peaton') {
                      setFormTipoRegistro('salida_cola');
                      setFormCategoriaSalida('respeta');
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  {LISTA_TIPOS_VEHICULOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {TIPOS_VEHICULOS[tipo].nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de registro */}
              {formTipoVehiculo !== 'peaton' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Tipo de Evento
                  </label>
                  <select
                    value={formTipoRegistro}
                    onChange={(e) => setFormTipoRegistro(e.target.value as TipoRegistroEvento)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="salida_cola">Salida de Cola (Cruce con espera)</option>
                    <option value="movimiento">Giro / Movimiento direccional</option>
                  </select>
                </div>
              )}

              {/* Fase Semafórica / Comportamiento (si salida_cola) */}
              {formTipoVehiculo !== 'peaton' && formTipoRegistro === 'salida_cola' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Fase Semafórica al Cruce (Ciclo 96s)
                  </label>
                  <select
                    value={formFaseCruce}
                    onChange={(e) => {
                      const f = e.target.value;
                      setFormFaseCruce(f);
                      setFormCategoriaSalida(f === 'rojo' ? 'se_vuela' : 'respeta');
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="verde">🟢 Verde (0-18s) - Respeta</option>
                    <option value="amarillo">🟡 Amarillo (18-21s / 93-96s) - Precaución</option>
                    <option value="rojo">🔴 Rojo (21-93s) - Se vuela / Infracción</option>
                  </select>
                </div>
              )}

              {/* Movimiento (si giro) */}
              {formTipoVehiculo !== 'peaton' && formTipoRegistro === 'movimiento' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Dirección del Giro
                  </label>
                  <select
                    value={formMovimiento}
                    onChange={(e) => setFormMovimiento(e.target.value as MovimientoGiro)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="recto">Recto</option>
                    <option value="izquierda">Izquierda</option>
                    <option value="derecha">Derecha</option>
                  </select>
                </div>
              )}

              {/* Peatón opciones */}
              {formTipoVehiculo === 'peaton' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Comportamiento Peatonal
                  </label>
                  <select
                    value={formCategoriaSalida}
                    onChange={(e) => setFormCategoriaSalida(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="cebra">Cruza por cebra</option>
                    <option value="fuera_cebra">Cruza fuera de cebra (imprudente)</option>
                    <option value="anden">Pasa por andén/acera</option>
                  </select>
                </div>
              )}

              {/* Timestamps de Cola, Servidor y Salida (si salida_cola) */}
              {formTipoVehiculo !== 'peaton' && formTipoRegistro === 'salida_cola' && (
                <div className="space-y-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      1. Hora Entrada a la Cola
                    </label>
                    <input
                      type="datetime-local"
                      step="1"
                      required
                      value={formHoraEntrada}
                      onChange={(e) => {
                        setFormHoraEntrada(e.target.value);
                        recalcularTiempos(e.target.value, formHoraLlegaServidor, formHoraSalida);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      2. Hora Llega al Semáforo / Servidor
                    </label>
                    <input
                      type="datetime-local"
                      step="1"
                      required
                      value={formHoraLlegaServidor}
                      onChange={(e) => {
                        setFormHoraLlegaServidor(e.target.value);
                        recalcularTiempos(formHoraEntrada, e.target.value, formHoraSalida);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      3. Hora Salida / Cruce
                    </label>
                    <input
                      type="datetime-local"
                      step="1"
                      required
                      value={formHoraSalida}
                      onChange={(e) => {
                        setFormHoraSalida(e.target.value);
                        recalcularTiempos(formHoraEntrada, formHoraLlegaServidor, e.target.value);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Recálculo visible de los tres tiempos derivados */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Tiempo en cola:</span>
                      <strong className="text-amber-400 font-bold">{formTiempoEnColaSeg}s</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Tiempo en semáforo/servidor:</span>
                      <strong className="text-cyan-400 font-bold">{formTiempoEnServidorSeg}s</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-200 pt-1 border-t border-slate-800">
                      <span className="font-semibold flex items-center gap-1 font-sans">
                        <Timer className="w-3.5 h-3.5 text-blue-400" />
                        Tiempo Total Calculado:
                      </span>
                      <strong className="text-sm font-bold text-emerald-400 font-mono">
                        {formTiempoTotalSeg}s
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEventoEditando(null);
                    setModalManualAbierto(false);
                  }}
                  className="touch-btn px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="touch-btn px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{guardando ? 'Guardando...' : 'Guardar Evento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
