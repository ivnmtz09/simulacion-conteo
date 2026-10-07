import React, { useState } from 'react';
import { X, CheckSquare, Square, Play, AlertCircle, MapPin, Tag, Check, Users } from 'lucide-react';
import type { TipoVehiculo, SesionConteo } from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';
import { db, collection, addDoc } from '../lib/firebase';
import { VehiculoIcono } from './VehiculoIcono';

interface NuevaSesionModalProps {
  abierto: boolean;
  usuarioActual: string;
  onCerrar: () => void;
  onSesionCreada: (sesion: SesionConteo) => void;
}

export const NuevaSesionModal: React.FC<NuevaSesionModalProps> = ({
  abierto,
  usuarioActual,
  onCerrar,
  onSesionCreada
}) => {
  const [nombre, setNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  // 1. Tipos monitoreados por la sesión en general
  const [tiposSeleccionados, setTiposSeleccionados] = useState<TipoVehiculo[]>([
    ...LISTA_TIPOS_VEHICULOS
  ]);
  // 2. Tipos que el creador contará personalmente
  const [misTipos, setMisTipos] = useState<TipoVehiculo[]>([
    'moto',
    'carro'
  ]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!abierto) return null;

  // Toggle de tipos monitoreados en la sesión general
  const toggleTipoSesion = (tipo: TipoVehiculo) => {
    if (tiposSeleccionados.includes(tipo)) {
      setTiposSeleccionados(tiposSeleccionados.filter((t) => t !== tipo));
      // Si se desmarca de la sesión, desmarcarlo de misTipos
      setMisTipos(misTipos.filter((t) => t !== tipo));
    } else {
      setTiposSeleccionados([...tiposSeleccionados, tipo]);
    }
  };

  const seleccionarTodosSesion = () => {
    setTiposSeleccionados([...LISTA_TIPOS_VEHICULOS]);
  };

  const limpiarSesion = () => {
    setTiposSeleccionados([]);
    setMisTipos([]);
  };

  // Toggle de tipos que contará personalmente el creador
  const toggleMiTipo = (tipo: TipoVehiculo) => {
    if (misTipos.includes(tipo)) {
      setMisTipos(misTipos.filter((t) => t !== tipo));
    } else {
      // Si no estaba en la sesión general, agregarlo automáticamente
      if (!tiposSeleccionados.includes(tipo)) {
        setTiposSeleccionados([...tiposSeleccionados, tipo]);
      }
      setMisTipos([...misTipos, tipo]);
    }
  };

  const tomarTodosMisTipos = () => {
    setMisTipos([...tiposSeleccionados]);
  };

  const limpiarMisTipos = () => {
    setMisTipos([]);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Ingresa un nombre descriptivo para la sesión de aforo.');
      return;
    }
    if (tiposSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un tipo de vehículo o peatón para monitorear en la sesión.');
      return;
    }

    setError(null);
    setGuardando(true);

    try {
      // Solo asignar al creador los vehículos que él personalmente eligió contar
      const asignacionesIniciales: Partial<Record<TipoVehiculo, string>> = {};
      misTipos.forEach((t) => {
        asignacionesIniciales[t] = usuarioActual;
      });

      const nuevaSesionData: Omit<SesionConteo, 'id'> = {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || 'Intersección principal',
        usuario: usuarioActual,
        participantes: [usuarioActual],
        asignaciones: asignacionesIniciales,
        tiposSeleccionados,
        activa: true,
        estado: 'abierta',
        fechaCreacion: new Date().toISOString(),
        fechaCierre: null
      };

      const docRef = await addDoc(collection(db, 'sesiones'), nuevaSesionData);
      const sesionCreada: SesionConteo = {
        id: docRef.id,
        ...nuevaSesionData
      };

      onSesionCreada(sesionCreada);
      onCerrar();
    } catch (err: unknown) {
      console.error('Error al guardar sesión:', err);
      // Fallback offline / local
      const asignacionesIniciales: Partial<Record<TipoVehiculo, string>> = {};
      misTipos.forEach((t) => {
        asignacionesIniciales[t] = usuarioActual;
      });

      const sesionLocal: SesionConteo = {
        id: 'local_' + Date.now(),
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || 'Intersección principal',
        usuario: usuarioActual,
        participantes: [usuarioActual],
        asignaciones: asignacionesIniciales,
        tiposSeleccionados,
        activa: true,
        estado: 'abierta',
        fechaCreacion: new Date().toISOString(),
        fechaCierre: null
      };
      onSesionCreada(sesionLocal);
      onCerrar();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative my-8">
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>Nueva Sesión de Conteo</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Define la intersección, qué tipos monitoreará la sesión en general y cuáles contarás tú personalmente.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCrear} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre de la Sesión *
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej: Calle 15 con Cra 8 - Pico Mañana"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ubicación / Carril / Acceso
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="ej: Acceso Norte - Carril Izquierdo"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 1. SELECCIÓN GENERAL DE VEHÍCULOS DE LA SESIÓN */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-200">
                1. Vehículos de la Sesión (General) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={seleccionarTodosSesion}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                >
                  Todos
                </button>
                <span className="text-slate-600 text-xs">|</span>
                <button
                  type="button"
                  onClick={limpiarSesion}
                  className="text-[11px] text-slate-400 hover:text-slate-300 underline"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-2.5">
              Categorías que el equipo monitoreará en este estudio ({tiposSeleccionados.length} activas):
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LISTA_TIPOS_VEHICULOS.map((tipo) => {
                const info = TIPOS_VEHICULOS[tipo];
                const seleccionado = tiposSeleccionados.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => toggleTipoSesion(tipo)}
                    className={`touch-btn p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                      seleccionado
                        ? 'bg-slate-800 border-blue-500/60 shadow-sm shadow-blue-500/10'
                        : 'bg-slate-900/60 border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="text-blue-400 shrink-0">
                      {seleccionado ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
                      <VehiculoIcono tipo={tipo} className={`w-4 h-4 ${info.color}`} />
                    </div>
                    <span className={`text-xs font-bold truncate ${seleccionado ? 'text-white' : 'text-slate-400'}`}>
                      {info.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. ASIGNACIÓN PERSONAL DEL CREADOR (misTipos) */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <label className="text-xs font-bold text-slate-200">
                  2. Tu Asignación Inicial: ¿Cuáles contarás tú?
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={tomarTodosMisTipos}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                >
                  Contar todos
                </button>
                <span className="text-slate-600 text-xs">|</span>
                <button
                  type="button"
                  onClick={limpiarMisTipos}
                  className="text-[11px] text-slate-400 hover:text-slate-300 underline"
                >
                  Ninguno ahora
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-2.5">
              Los vehículos no seleccionados aquí quedarán <strong className="text-emerald-400">libres</strong> para que tus compañeros se unan y los aforen sin conflicto.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tiposSeleccionados.map((tipo) => {
                const info = TIPOS_VEHICULOS[tipo];
                const tomadoPorMi = misTipos.includes(tipo);

                return (
                  <div
                    key={tipo}
                    onClick={() => toggleMiTipo(tipo)}
                    className={`touch-btn cursor-pointer p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                      tomadoPorMi
                        ? 'bg-blue-950/30 border-blue-500/60 shadow-sm'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-blue-400 shrink-0">
                        {tomadoPorMi ? (
                          <CheckSquare className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
                        <VehiculoIcono tipo={tipo} className={`w-4 h-4 ${info.color}`} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {info.nombre}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {info.subtitulo}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {tomadoPorMi ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          <Check className="w-3 h-3" />
                          Tú
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Users className="w-3 h-3" />
                          Libre
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={guardando}
              className="touch-btn w-full py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{guardando ? 'Iniciando Sesión...' : 'Comenzar Conteo Ahora'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
