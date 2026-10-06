import React, { useState } from 'react';
import { X, CheckSquare, Square, Play, AlertCircle, MapPin, Tag } from 'lucide-react';
import type { TipoVehiculo, SesionConteo } from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';
import { db, collection, addDoc } from '../lib/firebase';

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
  const [tiposSeleccionados, setTiposSeleccionados] = useState<TipoVehiculo[]>([
    'moto',
    'carro'
  ]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!abierto) return null;

  const toggleTipo = (tipo: TipoVehiculo) => {
    if (tiposSeleccionados.includes(tipo)) {
      setTiposSeleccionados(tiposSeleccionados.filter((t) => t !== tipo));
    } else {
      setTiposSeleccionados([...tiposSeleccionados, tipo]);
    }
  };

  const seleccionarTodos = () => {
    setTiposSeleccionados([...LISTA_TIPOS_VEHICULOS]);
  };

  const limpiarSeleccion = () => {
    setTiposSeleccionados([]);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Ingresa un nombre descriptivo para la sesión de aforo.');
      return;
    }
    if (tiposSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un tipo de vehículo o peatón para contar.');
      return;
    }

    setError(null);
    setGuardando(true);

    try {
      const asignacionesIniciales: Partial<Record<TipoVehiculo, string>> = {};
      tiposSeleccionados.forEach((t) => {
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
    } catch (err: any) {
      console.error('Error al guardar sesión:', err);
      // Fallback offline / local
      const asignacionesIniciales: Partial<Record<TipoVehiculo, string>> = {};
      tiposSeleccionados.forEach((t) => {
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative my-8">
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>Nueva Sesión de Conteo</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Define la intersección y elige tus roles de conteo asignados para esta tanda.
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

          {/* Selección de roles con checkboxes */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200">
                Selección de Rol: ¿Qué vas a contar? *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={seleccionarTodos}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                >
                  Todos
                </button>
                <span className="text-slate-600 text-xs">|</span>
                <button
                  type="button"
                  onClick={limpiarSeleccion}
                  className="text-[11px] text-slate-400 hover:text-slate-300 underline"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Marca uno o varios tipos. En la pantalla de aforo aparecerá un bloque dedicado para cada categoría seleccionada:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LISTA_TYPES_RENDER.map((tipo) => {
                const info = TIPOS_VEHICULOS[tipo];
                const seleccionado = tiposSeleccionados.includes(tipo);
                return (
                  <div
                    key={tipo}
                    onClick={() => toggleTipo(tipo)}
                    className={`touch-btn cursor-pointer p-3 rounded-xl border flex items-start gap-3 transition ${
                      seleccionado
                        ? 'bg-slate-800/90 border-blue-500/60 shadow-sm shadow-blue-500/10'
                        : 'bg-slate-800/40 border-slate-700/60 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="mt-0.5 text-blue-400 shrink-0">
                      {seleccionado ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <span className="text-2xl shrink-0 select-none leading-none pt-0.5">
                      {info.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-bold ${info.color}`}>
                          {info.nombre}
                        </span>
                        {!info.esVehiculoMotorizado && (
                          <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                            Sin cola
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                        {info.subtitulo}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={guardando}
              className="touch-btn w-full py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
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

const LISTA_TYPES_RENDER = LISTA_TIPOS_VEHICULOS;
