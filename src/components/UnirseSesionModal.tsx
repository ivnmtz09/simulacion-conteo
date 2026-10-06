import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Users, Lock, Check, AlertCircle } from 'lucide-react';
import type { TipoVehiculo, SesionConteo } from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';
import { db, doc, updateDoc, onSnapshot } from '../lib/firebase';

interface UnirseSesionModalProps {
  abierto: boolean;
  sesion: SesionConteo | null;
  usuarioActual: string;
  onCerrar: () => void;
  onUnirseExitoso: (sesionActualizada: SesionConteo) => void;
}

const obtenerTiposIniciales = (sesion: SesionConteo, usuarioActual: string): TipoVehiculo[] => {
  const asignaciones = sesion.asignaciones || {};
  const misTipos = LISTA_TIPOS_VEHICULOS.filter(
    (t) => asignaciones[t] === usuarioActual
  );
  if (misTipos.length === 0) {
    const primerLibre = LISTA_TIPOS_VEHICULOS.find((t) => !asignaciones[t]);
    return primerLibre ? [primerLibre] : [];
  }
  return misTipos;
};

export const UnirseSesionModal: React.FC<UnirseSesionModalProps> = ({
  abierto,
  sesion,
  usuarioActual,
  onCerrar,
  onUnirseExitoso
}) => {
  if (!abierto || !sesion) return null;

  return (
    <UnirseSesionDialog
      key={sesion.id}
      sesion={sesion}
      usuarioActual={usuarioActual}
      onCerrar={onCerrar}
      onUnirseExitoso={onUnirseExitoso}
    />
  );
};

interface UnirseSesionDialogProps {
  sesion: SesionConteo;
  usuarioActual: string;
  onCerrar: () => void;
  onUnirseExitoso: (sesionActualizada: SesionConteo) => void;
}

const UnirseSesionDialog: React.FC<UnirseSesionDialogProps> = ({
  sesion,
  usuarioActual,
  onCerrar,
  onUnirseExitoso
}) => {
  const [sesionViva, setSesionViva] = useState<SesionConteo>(sesion);
  const [tiposElegidos, setTiposElegidos] = useState<TipoVehiculo[]>(() =>
    obtenerTiposIniciales(sesion, usuarioActual)
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Escuchar la sesión en tiempo real para que las asignaciones tomadas por otros aparezcan inmediatamente
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'sesiones', sesion.id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Omit<SesionConteo, 'id'>;
          const actualizada: SesionConteo = {
            id: docSnap.id,
            ...data
          };
          setSesionViva(actualizada);

          // Si otro integrante tomó un rol que teníamos seleccionado, desmarcarlo reactivamente
          const asignacionesActuales = data.asignaciones || {};
          setTiposElegidos((prev) =>
            prev.filter((tipo) => {
              const asignadoA = asignacionesActuales[tipo];
              return !asignadoA || asignadoA === usuarioActual;
            })
          );
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Listener de sesión viva:', e);
    }
  }, [sesion.id, usuarioActual]);

  const asignaciones = sesionViva.asignaciones || {};

  const toggleTipo = (tipo: TipoVehiculo) => {
    const asignadoA = asignaciones[tipo];
    // Si ya está asignado a otro compañero, no permitir toggle
    if (asignadoA && asignadoA !== usuarioActual) {
      return;
    }

    if (tiposElegidos.includes(tipo)) {
      setTiposElegidos(tiposElegidos.filter((t) => t !== tipo));
    } else {
      setTiposElegidos([...tiposElegidos, tipo]);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tiposElegidos.length === 0) {
      setError('Debes seleccionar al menos un tipo de vehículo para contar en esta sesión.');
      return;
    }

    setError(null);
    setGuardando(true);

    try {
      // Construir mapa de asignaciones actualizado
      const nuevasAsignaciones: Partial<Record<TipoVehiculo, string>> = {};

      // Conservar asignaciones de los demás integrantes
      Object.entries(asignaciones).forEach(([t, u]) => {
        if (u !== usuarioActual) {
          nuevasAsignaciones[t as TipoVehiculo] = u;
        }
      });

      // Asignar los nuevos tipos elegidos por este usuario
      tiposElegidos.forEach((t) => {
        nuevasAsignaciones[t] = usuarioActual;
      });

      // Actualizar lista de participantes
      const participantesPrevios = sesionViva.participantes || [sesionViva.usuario];
      const nuevosParticipantes = Array.from(new Set([...participantesPrevios, usuarioActual]));

      // Todos los tipos activos en la sesión
      const nuevosTiposSeleccionados = Object.keys(nuevasAsignaciones) as TipoVehiculo[];

      const docRef = doc(db, 'sesiones', sesionViva.id);
      await updateDoc(docRef, {
        asignaciones: nuevasAsignaciones,
        participantes: nuevosParticipantes,
        tiposSeleccionados: nuevosTiposSeleccionados
      });

      const sesionActualizada: SesionConteo = {
        ...sesionViva,
        asignaciones: nuevasAsignaciones,
        participantes: nuevosParticipantes,
        tiposSeleccionados: nuevosTiposSeleccionados
      };

      onUnirseExitoso(sesionActualizada);
      onCerrar();
    } catch (err) {
      console.error('Error al unirse a la sesión:', err);
      // Fallback local
      const nuevasAsignaciones: Partial<Record<TipoVehiculo, string>> = { ...asignaciones };
      tiposElegidos.forEach((t) => {
        nuevasAsignaciones[t] = usuarioActual;
      });
      const sesionActualizada: SesionConteo = {
        ...sesion,
        asignaciones: nuevasAsignaciones,
        participantes: Array.from(new Set([...(sesion.participantes || []), usuarioActual]))
      };
      onUnirseExitoso(sesionActualizada);
      onCerrar();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative my-6">
        <button
          onClick={onCerrar}
          disabled={guardando}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Sesión Compartida del Equipo</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {sesion.nombre}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Creada por <strong className="text-slate-300">{sesion.usuario}</strong>. Selecciona qué vas a contar tú sin duplicar roles con tus compañeros.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleGuardar} className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300">
              Disponibilidad de tipos de vehículo:
            </div>

            <div className="grid grid-cols-1 gap-2">
              {LISTA_TIPOS_VEHICULOS.map((tipo) => {
                const info = TIPOS_VEHICULOS[tipo];
                const asignadoA = asignaciones[tipo];
                const estaTomadoPorOtro = Boolean(asignadoA && asignadoA !== usuarioActual);
                const seleccionadoPorMi = tiposElegidos.includes(tipo);

                return (
                  <div
                    key={tipo}
                    onClick={() => !estaTomadoPorOtro && toggleTipo(tipo)}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${
                      estaTomadoPorOtro
                        ? 'bg-slate-950/60 border-slate-800 opacity-60 cursor-not-allowed'
                        : seleccionadoPorMi
                        ? 'bg-slate-800 border-blue-500/60 shadow-md shadow-blue-500/10 cursor-pointer'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-blue-400 shrink-0">
                        {estaTomadoPorOtro ? (
                          <Lock className="w-4 h-4 text-slate-500" />
                        ) : seleccionadoPorMi ? (
                          <CheckSquare className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <span className="text-2xl select-none leading-none">
                        {info.emoji}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${info.color}`}>
                            {info.nombre}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                          {info.subtitulo}
                        </p>
                      </div>
                    </div>

                    {/* Estado de asignación */}
                    <div>
                      {estaTomadoPorOtro ? (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Ya lo cuenta: {asignadoA?.split('@')[0]}
                          </span>
                        </div>
                      ) : seleccionadoPorMi ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Asignado a ti
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-400">
                          Disponible
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="touch-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="touch-btn px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{guardando ? 'Actualizando...' : 'Confirmar Roles y Entrar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
