import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Users,
  MapPin,
  Clock,
  ArchiveRestore
} from 'lucide-react';
import type { SesionConteo, EventoConteo } from '../types/conteo';
import { TIPOS_VEHICULOS } from '../types/conteo';
import { db, doc, updateDoc, deleteDoc } from '../lib/firebase';

interface PapeleraSesionesProps {
  sesiones: SesionConteo[];
  todosLosEventos: EventoConteo[];
  onSesionRestaurada?: (sesionId: string) => void;
}

export const PapeleraSesiones: React.FC<PapeleraSesionesProps> = ({
  sesiones,
  todosLosEventos,
  onSesionRestaurada
}) => {
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Filtrar exclusivamente sesiones que están en papelera
  const sesionesEnPapelera = sesiones.filter((s) => Boolean(s.enPapelera));

  const formatFecha = (iso?: string | null) => {
    if (!iso) return 'Fecha desconocida';
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

  const handleRestaurar = async (sesion: SesionConteo) => {
    setProcesandoId(sesion.id);
    try {
      await updateDoc(doc(db, 'sesiones', sesion.id), {
        enPapelera: false,
        fechaEliminacion: null
      });
      if (onSesionRestaurada) {
        onSesionRestaurada(sesion.id);
      }
    } catch (err) {
      console.error('Error al restaurar sesión:', err);
      alert('Error al restaurar la sesión en Firestore.');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEliminarPermanente = async (sesion: SesionConteo) => {
    // Segunda confirmación estricta y explícita
    const confirmado = window.confirm(
      'Esta acción eliminará permanentemente la sesión y no se puede deshacer. ¿Deseas continuar?'
    );
    if (!confirmado) return;

    setProcesandoId(sesion.id);
    try {
      await deleteDoc(doc(db, 'sesiones', sesion.id));
    } catch (err) {
      console.error('Error al eliminar permanentemente la sesión:', err);
      alert('Error al eliminar físicamente la sesión en Firestore.');
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Encabezado */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <span>Papelera de Sesiones</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Las sesiones aquí archivadas no aparecen en los listados del equipo. Puedes restaurarlas o eliminarlas de forma definitiva.
          </p>
        </div>
        <div className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
          {sesionesEnPapelera.length} en papelera
        </div>
      </div>

      {/* Lista de Sesiones en Papelera */}
      <div className="grid grid-cols-1 gap-3">
        {sesionesEnPapelera.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-sm">
            <ArchiveRestore className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
            <p className="font-medium text-slate-400">La papelera está vacía.</p>
            <p className="text-xs text-slate-500 mt-1">
              Las sesiones que elimines desde el historial se mantendrán aquí a salvo antes de su eliminación permanente.
            </p>
          </div>
        ) : (
          sesionesEnPapelera.map((s) => {
            const eventosDeEsta = todosLosEventos.filter((e) => e.sesionId === s.id);
            const estaProcesando = procesandoId === s.id;

            return (
              <div
                key={s.id}
                className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-200 truncate">
                      {s.nombre}
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      En papelera
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Creada: {formatFecha(s.fechaCreacion)}
                    </span>
                    {s.fechaEliminacion && (
                      <span className="flex items-center gap-1 text-rose-400/80">
                        <Trash2 className="w-3.5 h-3.5 text-rose-400/70" />
                        Eliminada: {formatFecha(s.fechaEliminacion)}
                      </span>
                    )}
                    {s.ubicacion && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {s.ubicacion}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {s.usuario.split('@')[0]}
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
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-slate-800 border-slate-700 text-slate-400 flex items-center gap-1"
                        >
                          {info && <span className="text-xs">{info.emoji}</span>}
                          <span>{info?.nombre || t}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Acciones de la papelera: Restaurar / Eliminar Permanentemente */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={estaProcesando}
                    onClick={() => handleRestaurar(s)}
                    className="touch-btn text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    title="Restaurar sesión y devolverla al historial"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar</span>
                  </button>

                  <button
                    type="button"
                    disabled={estaProcesando}
                    onClick={() => handleEliminarPermanente(s)}
                    className="touch-btn text-xs font-bold px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    title="Eliminar permanentemente de Firestore"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Eliminar definitivamente</span>
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
