import React, { useState } from 'react';
import {
  History,
  FileSpreadsheet,
  Download,
  Trash2,
  Calendar,
  Users,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  RotateCcw,
  Settings2
} from 'lucide-react';
import type { SesionConteo, EventoConteo } from '../types/conteo';
import { TIPOS_VEHICULOS } from '../types/conteo';
import { exportarEventosXLSX, exportarEventosCSV } from '../lib/exportUtils';
import { db, doc, updateDoc } from '../lib/firebase';
import { VehiculoIcono } from './VehiculoIcono';

interface HistorialSesionesProps {
  sesiones: SesionConteo[];
  sesionActivaId: string | null;
  todosLosEventos: EventoConteo[];
  onSeleccionarSesion: (sesion: SesionConteo) => void;
  onCerrarSesionActiva: () => Promise<void>;
  onEliminarSesionLocal?: (id: string) => void;
  onAbrirUnirse?: (sesion: SesionConteo) => void;
  onRestaurarSesion?: (sesion: SesionConteo, continuarConteo?: boolean) => void;
  onEditarSesion?: (sesion: SesionConteo) => void;
}

export const HistorialSesiones: React.FC<HistorialSesionesProps> = ({
  sesiones,
  sesionActivaId,
  todosLosEventos,
  onSeleccionarSesion,
  onCerrarSesionActiva,
  onEliminarSesionLocal,
  onAbrirUnirse,
  onRestaurarSesion,
  onEditarSesion
}) => {
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  // Filtrar estrictamente sesiones que no estén en la papelera
  const sesionesVisibles = sesiones.filter((s) => !s.enPapelera);

  const formatFecha = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? iso
      : d.toLocaleString('es-CO', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  };

  const handleEliminar = async (sesion: SesionConteo, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`¿Deseas enviar la sesión "${sesion.nombre}" a la papelera? Podrás restaurarla en la pestaña Papelera.`)) {
      return;
    }

    setEliminandoId(sesion.id);

    // 1. Eliminación optimista inmediata en UI
    if (onEliminarSesionLocal) {
      onEliminarSesionLocal(sesion.id);
    }

    // 2. Persistir en Firestore en segundo plano
    try {
      await updateDoc(doc(db, 'sesiones', sesion.id), {
        enPapelera: true,
        fechaEliminacion: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error al enviar sesión a la papelera en Firestore:', err);
      alert('Error al enviar sesión a la papelera en Firestore.');
    } finally {
      setEliminandoId(null);
    }
  };

  const handleExportarXLSX = (sesion: SesionConteo, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const evs = todosLosEventos.filter((ev) => ev.sesionId === sesion.id && !ev.enPapelera);
    exportarEventosXLSX(sesion, evs);
  };

  const handleExportarCSV = (sesion: SesionConteo, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const evs = todosLosEventos.filter((ev) => ev.sesionId === sesion.id && !ev.enPapelera);
    exportarEventosCSV(sesion, evs);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <span>Historial de Sesiones de Aforo</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Consulta sesiones anteriores, únete con tus roles a sesiones abiertas o descarga reportes VISSIM.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sesionesVisibles.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
            No hay sesiones activas ni archivadas. Crea una nueva sesión para comenzar el aforo.
          </div>
        ) : (
          sesionesVisibles.map((s) => {
            const eventosDeEsta = todosLosEventos.filter((e) => e.sesionId === s.id && !e.enPapelera);
            const esActiva = s.id === sesionActivaId;
            const esAbierta = (s.activa || s.estado === 'abierta') && !s.enPapelera;
            const participantes = s.participantes || [s.usuario];

            return (
              <div
                key={s.id}
                className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  esActiva
                    ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                    : 'border-slate-800 hover:border-slate-700/80'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white truncate">
                      {s.nombre}
                    </h3>
                    {esActiva ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Activa ahora
                      </span>
                    ) : esAbierta ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                        Abierta
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        Cerrada
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {formatFecha(s.fechaCreacion)}
                    </span>
                    {s.ubicacion && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {s.ubicacion}
                      </span>
                    )}
                    <span className="flex items-center gap-1" title={`Participantes: ${participantes.join(', ')}`}>
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{s.usuario.split('@')[0]}</span>
                      {participantes.length > 1 && (
                        <span className="text-[10px] text-emerald-400 font-bold">
                          (+{participantes.length - 1})
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 font-mono font-bold text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      {eventosDeEsta.length} eventos
                    </span>
                  </div>

                  {/* Badges de tipos seleccionados con VehiculoIcono (cero emojis) */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-500 font-semibold">Tipos:</span>
                    {(s.tiposSeleccionados || []).map((t) => {
                      const info = TIPOS_VEHICULOS[t];
                      return (
                        <span
                          key={t}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${
                            info ? `${info.badgeBg} ${info.color} ${info.badgeBorder}` : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          <VehiculoIcono tipo={t} className="w-3.5 h-3.5" />
                          <span>{info?.nombre || t}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Acciones explícitas de la sesión */}
                <div
                  className="flex items-center gap-2 self-end sm:self-center shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Botón de navegación principal */}
                  {esActiva ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSeleccionarSesion(s);
                        }}
                        className="touch-btn text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Ir a la pantalla de conteo en vivo de esta sesión activa"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ver conteo</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onCerrarSesionActiva();
                        }}
                        className="touch-btn text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 cursor-pointer"
                        title="Finalizar esta sesión de aforo para todo el equipo"
                      >
                        Finalizar
                      </button>
                    </div>
                  ) : esAbierta ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onAbrirUnirse) {
                          onAbrirUnirse(s);
                        } else {
                          onSeleccionarSesion(s);
                        }
                      }}
                      className="touch-btn text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title="Unirse o seleccionar tus roles en esta sesión abierta"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Retomar / Unirse</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSeleccionarSesion(s);
                        }}
                        className="touch-btn text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                        title="Consultar la bitácora de eventos registrados en esta sesión cerrada"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Ver eventos</span>
                      </button>

                      {onRestaurarSesion && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRestaurarSesion(s);
                          }}
                          className="touch-btn text-xs font-bold px-2.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                          title="Restaurar y reactivar esta sesión finalizada para hacer ajustes o continuar el aforo"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar</span>
                        </button>
                      )}

                      {onEditarSesion && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditarSesion(s);
                          }}
                          className="touch-btn p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer active:scale-95"
                          title="Ajustar nombre, intersección o categorías de esta sesión"
                        >
                          <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Descarga XLSX */}
                  <button
                    type="button"
                    title="Exportar XLSX para Vissim"
                    onClick={(e) => handleExportarXLSX(s, e)}
                    className="touch-btn p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>

                  {/* Descarga CSV */}
                  <button
                    type="button"
                    title="Exportar CSV crudo"
                    onClick={(e) => handleExportarCSV(s, e)}
                    className="touch-btn p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Enviar a papelera */}
                  <button
                    type="button"
                    title="Enviar sesión a la papelera"
                    disabled={eliminandoId === s.id}
                    onClick={(e) => handleEliminar(s, e)}
                    className="touch-btn p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
