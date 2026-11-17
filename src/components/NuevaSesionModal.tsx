import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Square,
  Play,
  AlertCircle,
  MapPin,
  Tag,
  Check,
  Users,
  Compass,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers
} from 'lucide-react';
import type { TipoVehiculo, SesionConteo } from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';
import { db, collection, addDoc } from '../lib/firebase';
import { VehiculoIcono } from './VehiculoIcono';
import { PUNTOS_AFORO_VIAL, CONFIG_SEMAFORO_POR_DEFECTO } from '../config/equipo';

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
  if (!abierto) return null;

  return (
    <NuevaSesionDialog
      usuarioActual={usuarioActual}
      onCerrar={onCerrar}
      onSesionCreada={onSesionCreada}
    />
  );
};

interface NuevaSesionDialogProps {
  usuarioActual: string;
  onCerrar: () => void;
  onSesionCreada: (sesion: SesionConteo) => void;
}

const NuevaSesionDialog: React.FC<NuevaSesionDialogProps> = ({
  usuarioActual,
  onCerrar,
  onSesionCreada
}) => {
  const [paso, setPaso] = useState<1 | 2>(1);
  const usuarioNombre = (usuarioActual || '').split('@')[0];

  const [puntoSeleccionadoId, setPuntoSeleccionadoId] = useState<string>(PUNTOS_AFORO_VIAL[0].id);
  const puntoSeleccionado =
    PUNTOS_AFORO_VIAL.find((p) => p.id === puntoSeleccionadoId) || PUNTOS_AFORO_VIAL[0];

  const hoyStr = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short'
  });

  const [nombre, setNombre] = useState(
    `Aforo ${puntoSeleccionado.nombre.includes('Suchiimma') ? 'Suchiimma' : 'Cuatro Vías'} - ${usuarioNombre} (${hoyStr})`
  );
  const [ubicacion, setUbicacion] = useState(
    `${PUNTOS_AFORO_VIAL[0].nombre} (${PUNTOS_AFORO_VIAL[0].sentido})`
  );

  // Tipos seleccionados para la sesión general (por defecto todos seleccionados para facilidad de uso)
  const [tiposSeleccionados, setTiposSeleccionados] = useState<TipoVehiculo[]>([
    ...LISTA_TIPOS_VEHICULOS
  ]);

  // Tipos que contará personalmente el creador
  const [misTipos, setMisTipos] = useState<TipoVehiculo[]>([...LISTA_TIPOS_VEHICULOS]);

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Manejar cambio de punto de aforo y sincronizar nombre si no ha sido editado manualmente
  const handleSeleccionarPunto = (puntoId: string) => {
    setPuntoSeleccionadoId(puntoId);
    const punto = PUNTOS_AFORO_VIAL.find((p) => p.id === puntoId);
    if (punto) {
      setUbicacion(`${punto.nombre} (${punto.sentido})`);
      setNombre(
        `Aforo ${punto.nombre.includes('Suchiimma') ? 'Suchiimma' : 'Cuatro Vías'} - ${usuarioNombre} (${hoyStr})`
      );
    }
  };

  const toggleTipoSesion = (tipo: TipoVehiculo) => {
    if (tiposSeleccionados.includes(tipo)) {
      setTiposSeleccionados(tiposSeleccionados.filter((t) => t !== tipo));
      setMisTipos(misTipos.filter((t) => t !== tipo));
    } else {
      setTiposSeleccionados([...tiposSeleccionados, tipo]);
      setMisTipos([...misTipos, tipo]);
    }
  };

  const seleccionarTodosSesion = () => {
    setTiposSeleccionados([...LISTA_TIPOS_VEHICULOS]);
    setMisTipos([...LISTA_TIPOS_VEHICULOS]);
  };

  const limpiarSesion = () => {
    setTiposSeleccionados([]);
    setMisTipos([]);
  };

  const toggleMiTipo = (tipo: TipoVehiculo) => {
    if (misTipos.includes(tipo)) {
      setMisTipos(misTipos.filter((t) => t !== tipo));
    } else {
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

  const handleAvanzarPaso2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Por favor indica un nombre descriptivo para identificar la sesión.');
      return;
    }
    setError(null);
    setPaso(2);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tiposSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un tipo de vehículo o peatón.');
      return;
    }

    setError(null);
    setGuardando(true);

    try {
      const asignacionesIniciales: Partial<Record<TipoVehiculo, string>> = {};
      misTipos.forEach((t) => {
        asignacionesIniciales[t] = usuarioActual;
      });

      const nuevaSesionData: Omit<SesionConteo, 'id'> = {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || puntoSeleccionado.nombre,
        puntoId: puntoSeleccionadoId,
        configSemaforo: puntoSeleccionado.configSemaforo || CONFIG_SEMAFORO_POR_DEFECTO,
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
        ubicacion: ubicacion.trim() || puntoSeleccionado.nombre,
        puntoId: puntoSeleccionadoId,
        configSemaforo: puntoSeleccionado.configSemaforo || CONFIG_SEMAFORO_POR_DEFECTO,
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
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-nueva-sesion-titulo"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden">
        {/* ENCABEZADO CON STEPPER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                  paso === 1
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                Paso {paso} de 2
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {paso === 1 ? 'Lugar y Fecha' : 'Vehículos y Roles'}
              </span>
            </div>
            <h2 id="modal-nueva-sesion-titulo" className="text-base sm:text-lg font-black text-white">
              {paso === 1 ? 'Configurar Intersección' : 'Seleccionar Vehículos'}
            </h2>
          </div>

          <button
            onClick={onCerrar}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition focus:outline-none"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALERTA DE ERROR */}
        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* CUERPO CON SCROLL INDEPENDIENTE */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* PASO 1: LUGAR, COORDENADAS Y FECHA */}
          {paso === 1 && (
            <form id="form-paso-1" onSubmit={handleAvanzarPaso2} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-400" />
                  <span>1. Selecciona el Punto de Aforo *</span>
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {PUNTOS_AFORO_VIAL.map((p) => {
                    const activo = puntoSeleccionadoId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSeleccionarPunto(p.id)}
                        className={`p-3.5 rounded-2xl border text-left transition flex flex-col gap-2 cursor-pointer ${
                          activo
                            ? 'bg-blue-950/50 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                              <MapPin
                                className={`w-4 h-4 shrink-0 ${activo ? 'text-blue-400' : 'text-slate-500'}`}
                              />
                              <span className="truncate">{p.nombre}</span>
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {p.sentido}
                            </span>
                          </div>
                          {activo && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                              Seleccionado
                            </span>
                          )}
                        </div>

                        {/* Coordenadas GPS y Ciclo */}
                        <div className="flex items-center justify-between flex-wrap gap-1 text-[11px] font-mono pt-2 border-t border-slate-800/80">
                          <span className="text-slate-400">
                            📍 GPS: <strong className="text-blue-300">{p.coordenadasTexto}</strong>
                          </span>
                          <span className="text-emerald-400 font-bold">
                            Ciclo {p.configSemaforo.cicloTotalSeg}s ({p.configSemaforo.verdeSeg}s V /{' '}
                            {p.configSemaforo.rojoSeg}s R)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  <span>Nombre / Identificador de la Sesión *</span>
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Aforo Suchiimma - Turno Mañana"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Registrado por el aforador:{' '}
                  <strong className="text-slate-300 font-mono">{usuarioNombre}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Detalle de Ubicación o Carril</span>
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ubicación o carril específico"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition"
                />
              </div>
            </form>
          )}

          {/* PASO 2: SELECCIÓN DE VEHÍCULOS */}
          {paso === 2 && (
            <form id="form-paso-2" onSubmit={handleCrear} className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Punto y Turno:</span>
                  <strong className="text-white text-xs">{nombre}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="text-blue-400 hover:text-blue-300 text-xs font-bold underline shrink-0"
                >
                  Cambiar
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>¿Qué tipos de vehículos registrarás?</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={seleccionarTodosSesion}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-bold underline"
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

                <p className="text-[11px] text-slate-400 mb-2">
                  Selecciona los tipos que estarán activos en tus pantallas de aforo táctil:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {LISTA_TIPOS_VEHICULOS.map((tipo) => {
                    const info = TIPOS_VEHICULOS[tipo];
                    const seleccionado = tiposSeleccionados.includes(tipo);
                    const tomadoPorMi = misTipos.includes(tipo);

                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => toggleTipoSesion(tipo)}
                        className={`touch-btn p-3 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                          seleccionado
                            ? 'bg-blue-950/40 border-blue-500 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 opacity-50 hover:opacity-80'
                        }`}
                      >
                        <div className="text-blue-400 shrink-0">
                          {seleccionado ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
                          <VehiculoIcono tipo={tipo} className={`w-4 h-4 ${info.color}`} />
                        </div>

                        <div className="min-w-0">
                          <span
                            className={`text-xs font-bold block truncate ${
                              seleccionado ? 'text-white' : 'text-slate-400'
                            }`}
                          >
                            {info.nombre}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {tomadoPorMi ? 'Asignado a ti' : 'Sin asignar'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OPCIONES DE CO-CONTEO Y ASIGNACIÓN */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    Tu rol personal ({misTipos.length} asignados a ti):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={tomarTodosMisTipos}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline"
                    >
                      Tomar todos
                    </button>
                    <span className="text-slate-600 text-xs">|</span>
                    <button
                      type="button"
                      onClick={limpiarMisTipos}
                      className="text-[11px] text-slate-400 hover:text-slate-300 underline"
                    >
                      Liberar
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tiposSeleccionados.map((tipo) => {
                    const info = TIPOS_VEHICULOS[tipo];
                    const activo = misTipos.includes(tipo);

                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => toggleMiTipo(tipo)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                          activo
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <VehiculoIcono tipo={tipo} className="w-3.5 h-3.5" />
                        <span>{info.nombre}</span>
                        {activo ? <Check className="w-3 h-3" /> : <Users className="w-3 h-3 text-slate-500" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Los tipos no seleccionados para ti quedarán libres para que tus compañeros aforadores los tomen al ingresar a la sesión.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* PIE DE ACCIONES FIJO */}
        <div className="p-4 sm:p-5 border-t border-slate-800 shrink-0 bg-slate-900/90 flex items-center justify-between gap-3">
          {paso === 1 ? (
            <>
              <button
                type="button"
                onClick={onCerrar}
                className="touch-btn py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-paso-1"
                className="touch-btn py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 flex items-center gap-2 transition cursor-pointer"
              >
                <span>Siguiente: Vehículos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="touch-btn py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
              <button
                type="submit"
                form="form-paso-2"
                disabled={guardando}
                className="touch-btn py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{guardando ? 'Iniciando Sesión...' : 'Comenzar Conteo Ahora'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
