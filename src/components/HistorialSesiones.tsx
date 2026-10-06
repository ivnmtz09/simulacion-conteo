import React, { useState } from 'react';
import {
  History,
  Play,
  FileSpreadsheet,
  Download,
  Trash2,
  Calendar,
  Users,
  MapPin,
  Clock
} from 'lucide-react';
import type { SesionConteo, EventoConteo } from '../types/conteo';
import { TIPOS_VEHICULOS } from '../types/conteo';
import { exportarEventosXLSX, exportarEventosCSV } from '../lib/exportUtils';
import { db, doc, deleteDoc } from '../lib/firebase';

interface HistorialSesionesProps {
  sesiones: SesionConteo[];
  sesionActivaId: string | null;
  todosLosEventos: EventoConteo[];
  onSeleccionarSesion: (sesion: SesionConteo) => void;
  onCerrarSesionActiva: () => Promise<void>;
}

export const HistorialSesiones: React.FC<HistorialSesionesProps> = ({
  sesiones,
  sesionActivaId,
  todosLosEventos,
  onSeleccionarSesion,
  onCerrarSesionActiva
}) => {
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

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
    e.stopPropagation();
    if (!window.confirm(`¿Deseas eliminar permanentemente la sesión "${sesion.nombre}"?`)) {
      return;
    }
    setEliminandoId(sesion.id);
    try {
      await deleteDoc(doc(db, 'sesiones', sesion.id));
    } catch (err) {
      console.error(err);
      alert('Error al eliminar sesión en Firestore.');
    } finally {
      setEliminandoId(null);
    }
  };

  const handleExportarXLSX = (sesion: SesionConteo, e: React.MouseEvent) => {
    e.stopPropagation();
    const evs = todosLosEventos.filter((ev) => ev.sesionId === sesion.id);
    exportarEventosXLSX(sesion, evs);
  };

  const handleExportarCSV = (sesion: SesionConteo, e: React.MouseEvent) => {
    e.stopPropagation();
    const evs = todosLosEventos.filter((ev) => ev.sesionId === sesion.id);
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
            Consulta sesiones anteriores, activa una para continuar conteo o descarga reportes VISSIM.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sesiones.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
            No hay sesiones registradas. Crea una nueva sesión para comenzar el aforo.
          </div>
        ) : (
          sesiones.map((s) => {
            const eventosDeEsta = todosLosEventos.filter((e) => e.sesionId === s.id);
            const esActiva = s.id === sesionActivaId;

            return (
              <div
                key={s.id}
                onClick={() => onSeleccionarSesion(s)}
                className={`touch-btn cursor-pointer bg-slate-900 border rounded-2xl p-4 sm:p-5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  esActiva
                    ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white">
                      {s.nombre}
                    </h3>
                    {esActiva && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Activa ahora
                      </span>
                    )}
                    {!s.activa && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
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
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {s.usuario}
                    </span>
                    <span className="flex items-center gap-1 font-mono font-bold text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      {eventosDeEsta.length} eventos
                    </span>
                  </div>

                  {/* Badges de tipos seleccionados */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-slate-500 font-semibold">Tipos:</span>
                    {(s.tiposSeleccionados || []).map((t) => {
                      const info = TIPOS_VEHICULOS[t];
                      return (
                        <span
                          key={t}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            info ? `${info.badgeBg} ${info.color} ${info.badgeBorder}` : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {info && <span className="text-xs">{info.emoji}</span>}
                          <span>{info?.nombre || t}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Acciones de la sesión */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {esActiva ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCerrarSesionActiva();
                      }}
                      className="touch-btn text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                    >
                      Cerrar sesión
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSeleccionarSesion(s)}
                      className="touch-btn text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Retomar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    title="Exportar XLSX para Vissim"
                    onClick={(e) => handleExportarXLSX(s, e)}
                    className="touch-btn p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    title="Exportar CSV crudo"
                    onClick={(e) => handleExportarCSV(s, e)}
                    className="touch-btn p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700"
                  >
                    <Download className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    title="Eliminar sesión"
                    disabled={eliminandoId === s.id}
                    onClick={(e) => handleEliminar(s, e)}
                    className="touch-btn p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 disabled:opacity-50"
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
