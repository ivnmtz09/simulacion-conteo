import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Users, Check, AlertCircle, UserPlus, Info } from 'lucide-react';
import type { TipoVehiculo, SesionConteo } from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';
import { db, doc, updateDoc, onSnapshot } from '../lib/firebase';
import { VehiculoIcono } from './VehiculoIcono';

interface UnirseSesionModalProps {
  abierto: boolean;
  sesion: SesionConteo | null;
  usuarioActual: string;
  onCerrar: () => void;
  onUnirseExitoso: (sesionActualizada: SesionConteo) => void;
}

const parseAsignados = (asignadoStr?: string): string[] => {
  if (!asignadoStr) return [];
  return asignadoStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const obtenerTiposIniciales = (sesion: SesionConteo, usuarioActual: string): TipoVehiculo[] => {
  const asignaciones = sesion.asignaciones || {};
  // Si el usuario ya tenía asignaciones previas en esta sesión
  const misTipos = LISTA_TIPOS_VEHICULOS.filter((t) => {
    const usuarios = parseAsignados(asignaciones[t]);
    return usuarios.some((u) => u.toLowerCase() === usuarioActual.toLowerCase());
  });
  if (misTipos.length > 0) return misTipos;

  // Si no tenía, sugerir el primer tipo monitoreado libre
  const tiposMonitoreados = sesion.tiposSeleccionados?.length
    ? sesion.tiposSeleccionados
    : LISTA_TIPOS_VEHICULOS;
  const primerLibre = tiposMonitoreados.find((t) => parseAsignados(asignaciones[t]).length === 0);
  if (primerLibre) return [primerLibre];

  // Si todos están asignados, sugerir el primero para co-conteo
  return tiposMonitoreados.length > 0 ? [tiposMonitoreados[0]] : ['moto'];
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

  // Escuchar la sesión en tiempo real para reflejar asignaciones colaborativas en vivo
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
          // Permitir co-conteo: no desmarcamos agresivamente las selecciones del usuario
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Listener de sesión viva:', e);
    }
  }, [sesion.id, usuarioActual]);

  const asignaciones = sesionViva.asignaciones || {};

  // Toggle sin bloqueos: el usuario siempre puede seleccionar libres o co-contar
  const toggleTipo = (tipo: TipoVehiculo) => {
    if (tiposElegidos.includes(tipo)) {
      setTiposElegidos(tiposElegidos.filter((t) => t !== tipo));
    } else {
      setTiposElegidos([...tiposElegidos, tipo]);
    }
  };

  const seleccionarTodosLibres = () => {
    const libres = LISTA_TIPOS_VEHICULOS.filter((t) => parseAsignados(asignaciones[t]).length === 0);
    setTiposElegidos(Array.from(new Set([...tiposElegidos, ...libres])));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tiposElegidos.length === 0) {
      setError('Debes seleccionar al menos un tipo de vehículo o peatón para contar.');
      return;
    }

    setError(null);
    setGuardando(true);

    try {
      // 1. Construir mapa de asignaciones actualizado permitiendo co-conteo
      const nuevasAsignaciones: Partial<Record<TipoVehiculo, string>> = {};

      LISTA_TIPOS_VEHICULOS.forEach((tipo) => {
        const asignadosOriginales = parseAsignados(asignaciones[tipo]);
        // Remover al usuario actual para recalcular con su selección actual
        const sinMi = asignadosOriginales.filter((u) => u.toLowerCase() !== usuarioActual.toLowerCase());
        const elegidoPorMi = tiposElegidos.includes(tipo);

        const finalAsignados = elegidoPorMi ? [...sinMi, usuarioActual] : sinMi;
        if (finalAsignados.length > 0) {
          nuevasAsignaciones[tipo] = finalAsignados.join(', ');
        }
      });

      // 2. Participantes: agregar usuarioActual sin duplicados
      const participantesPrevios = sesionViva.participantes || [sesionViva.usuario];
      const nuevosParticipantes = Array.from(new Set([...participantesPrevios, usuarioActual]));

      // 3. PRESERVAR tiposSeleccionados originales de la sesión + los tipos elegidos
      const sessionTipos = sesionViva.tiposSeleccionados && sesionViva.tiposSeleccionados.length > 0
        ? sesionViva.tiposSeleccionados
        : LISTA_TIPOS_VEHICULOS;
      const tiposPreservados = Array.from(new Set([...sessionTipos, ...tiposElegidos]));

      const docRef = doc(db, 'sesiones', sesionViva.id);
      await updateDoc(docRef, {
        asignaciones: nuevasAsignaciones,
        participantes: nuevosParticipantes,
        tiposSeleccionados: tiposPreservados
      });

      const sesionActualizada: SesionConteo = {
        ...sesionViva,
        asignaciones: nuevasAsignaciones,
        participantes: nuevosParticipantes,
        tiposSeleccionados: tiposPreservados
      };

      onUnirseExitoso(sesionActualizada);
      onCerrar();
    } catch (err) {
      console.error('Error al unirse a la sesión:', err);
      // Fallback local
      const nuevasAsignaciones: Partial<Record<TipoVehiculo, string>> = {};
      LISTA_TIPOS_VEHICULOS.forEach((tipo) => {
        const asignadosOriginales = parseAsignados(asignaciones[tipo]);
        const sinMi = asignadosOriginales.filter((u) => u.toLowerCase() !== usuarioActual.toLowerCase());
        const finalAsignados = tiposElegidos.includes(tipo) ? [...sinMi, usuarioActual] : sinMi;
        if (finalAsignados.length > 0) {
          nuevasAsignaciones[tipo] = finalAsignados.join(', ');
        }
      });

      const sessionTipos = sesion.tiposSeleccionados && sesion.tiposSeleccionados.length > 0
        ? sesion.tiposSeleccionados
        : LISTA_TIPOS_VEHICULOS;
      const tiposPreservados = Array.from(new Set([...sessionTipos, ...tiposElegidos]));

      const sesionActualizada: SesionConteo = {
        ...sesion,
        asignaciones: nuevasAsignaciones,
        participantes: Array.from(new Set([...(sesion.participantes || []), usuarioActual])),
        tiposSeleccionados: tiposPreservados
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
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Sesión Compartida del Equipo</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {sesionViva.nombre}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Creada por <strong className="text-slate-300">{sesionViva.usuario.split('@')[0]}</strong>. Selecciona vehículos libres o súmate en co-conteo como apoyo.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Banner explicativo del co-conteo */}
        <div className="mb-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
          <p>
            Puedes tomar vehículos libres o apoyar en <strong>Co-conteo</strong> a compañeros en carriles con alto flujo vehicular.
          </p>
        </div>

        <form onSubmit={handleGuardar} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Roles y Asignaciones del Equipo:</span>
              <button
                type="button"
                onClick={seleccionarTodosLibres}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-normal"
              >
                Tomar libres
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {LISTA_TIPOS_VEHICULOS.map((tipo) => {
                const info = TIPOS_VEHICULOS[tipo];
                const asignados = parseAsignados(asignaciones[tipo]);
                const otrosAsignados = asignados.filter(
                  (u) => u.toLowerCase() !== usuarioActual.toLowerCase()
                );
                const seleccionadoPorMi = tiposElegidos.includes(tipo);
                const estaLibre = asignados.length === 0;
                const estaTomadoPorOtros = otrosAsignados.length > 0;

                return (
                  <div
                    key={tipo}
                    onClick={() => toggleTipo(tipo)}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition cursor-pointer ${
                      seleccionadoPorMi
                        ? estaTomadoPorOtros
                          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-800 border-blue-500/60 shadow-md shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-blue-400 shrink-0">
                        {seleccionadoPorMi ? (
                          <CheckSquare className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
                        <VehiculoIcono tipo={tipo} className={`w-4 h-4 ${info.color}`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-bold ${info.color}`}>
                            {info.nombre}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight truncate">
                          {info.subtitulo}
                        </p>
                      </div>
                    </div>

                    {/* Estado de asignación y co-conteo */}
                    <div className="shrink-0 text-right">
                      {estaLibre ? (
                        seleccionadoPorMi ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            <Check className="w-3 h-3" />
                            Asignado a ti
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Libre / Disponible
                          </span>
                        )
                      ) : estaTomadoPorOtros ? (
                        seleccionadoPorMi ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              <UserPlus className="w-3 h-3" />
                              Co-conteo / Apoyo
                            </span>
                            <span className="text-[9px] text-slate-400 truncate max-w-[140px]" title={otrosAsignados.join(', ')}>
                              Con {otrosAsignados.map((u) => u.split('@')[0]).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Cuenta: {otrosAsignados.map((u) => u.split('@')[0]).join(', ')}
                            </span>
                            <span className="text-[9px] text-blue-400 hover:underline">
                              + Co-conteo / Apoyo
                            </span>
                          </div>
                        )
                      ) : (
                        // Solo estaba asignado al usuario actual
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          <Check className="w-3 h-3" />
                          Asignado a ti
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="touch-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="touch-btn px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
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
