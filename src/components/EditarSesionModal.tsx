import React, { useState } from 'react';
import { X, Tag, MapPin, CheckSquare, Square, AlertCircle, Save, Compass } from 'lucide-react';
import type { TipoVehiculo, SesionConteo } from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';
import { VehiculoIcono } from './VehiculoIcono';
import { PUNTOS_AFORO_VIAL, CONFIG_SEMAFORO_POR_DEFECTO } from '../config/equipo';

interface EditarSesionModalProps {
  abierto: boolean;
  sesion: SesionConteo | null;
  onCerrar: () => void;
  onGuardar: (sesionId: string, datosActualizados: Partial<SesionConteo>) => Promise<void> | void;
}

export const EditarSesionModal: React.FC<EditarSesionModalProps> = ({
  abierto,
  sesion,
  onCerrar,
  onGuardar
}) => {
  if (!abierto || !sesion) return null;

  return (
    <EditarSesionDialog
      key={sesion.id}
      sesion={sesion}
      onCerrar={onCerrar}
      onGuardar={onGuardar}
    />
  );
};

interface EditarSesionDialogProps {
  sesion: SesionConteo;
  onCerrar: () => void;
  onGuardar: (sesionId: string, datosActualizados: Partial<SesionConteo>) => Promise<void> | void;
}

const EditarSesionDialog: React.FC<EditarSesionDialogProps> = ({
  sesion,
  onCerrar,
  onGuardar
}) => {
  const [nombre, setNombre] = useState(sesion.nombre || '');
  const [puntoSeleccionadoId, setPuntoSeleccionadoId] = useState<string>(
    sesion.puntoId || PUNTOS_AFORO_VIAL[0].id
  );
  const [ubicacion, setUbicacion] = useState(sesion.ubicacion || '');
  const [tiposSeleccionados, setTiposSeleccionados] = useState<TipoVehiculo[]>(
    sesion.tiposSeleccionados || [...LISTA_TIPOS_VEHICULOS]
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const handleSeleccionarPunto = (puntoId: string) => {
    setPuntoSeleccionadoId(puntoId);
    const punto = PUNTOS_AFORO_VIAL.find((p) => p.id === puntoId);
    if (punto) {
      setUbicacion(`${punto.nombre} (${punto.sentido})`);
    }
  };

  const toggleTipo = (tipo: TipoVehiculo) => {
    if (tiposSeleccionados.includes(tipo)) {
      if (tiposSeleccionados.length === 1) {
        setError('Debes mantener al menos un tipo de transporte seleccionado.');
        return;
      }
      setError(null);
      setTiposSeleccionados(tiposSeleccionados.filter((t) => t !== tipo));
    } else {
      setError(null);
      setTiposSeleccionados([...tiposSeleccionados, tipo]);
    }
  };

  const seleccionarTodos = () => {
    setTiposSeleccionados([...LISTA_TIPOS_VEHICULOS]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la sesión es obligatorio.');
      return;
    }
    if (tiposSeleccionados.length === 0) {
      setError('Debes seleccionar al menos un tipo de transporte.');
      return;
    }

    const punto = PUNTOS_AFORO_VIAL.find((p) => p.id === puntoSeleccionadoId);

    setError(null);
    setGuardando(true);
    try {
      await onGuardar(sesion.id, {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || punto?.nombre || 'Intersección principal',
        puntoId: puntoSeleccionadoId,
        configSemaforo: punto?.configSemaforo || sesion.configSemaforo || CONFIG_SEMAFORO_POR_DEFECTO,
        tiposSeleccionados
      });
      onCerrar();
    } catch (err) {
      console.error('Error al guardar edición de sesión:', err);
      setError('Ocurrió un error al guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-editar-sesion-titulo"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative my-8 text-left">
        <button
          onClick={onCerrar}
          disabled={guardando}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h2 id="modal-editar-sesion-titulo" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>Ajustar Parámetros de la Sesión</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Modifica el nombre, punto de aforo, tiempos semafóricos o los vehículos monitoreados.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SELECCIÓN DE PUNTO */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>Punto de Aforo e Intersección Semafórica</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PUNTOS_AFORO_VIAL.map((p) => {
                const activo = puntoSeleccionadoId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSeleccionarPunto(p.id)}
                    className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer ${
                      activo
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-md shadow-blue-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-black text-white truncate">{p.nombre}</span>
                      {activo && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate">{p.sentido}</span>
                    <span className="text-[10px] text-slate-500 font-mono">📍 GPS: {p.coordenadasTexto}</span>
                    <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] font-mono flex items-center justify-between text-slate-300">
                      <span className="text-emerald-400">{p.configSemaforo.verdeSeg}s V</span>
                      <span className="text-rose-400">{p.configSemaforo.rojoSeg}s R</span>
                      <span className="text-blue-300">Total {p.configSemaforo.cicloTotalSeg}s</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre de la Sesión (Día y fecha) *
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre de la sesión"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ubicación Detallada
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ubicación"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Categorías de transporte monitoreadas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Categorías Monitoreadas ({tiposSeleccionados.length})
              </label>
              <button
                type="button"
                onClick={seleccionarTodos}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Seleccionar todos
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LISTA_TIPOS_VEHICULOS.map((tipo) => {
                const info = TIPOS_VEHICULOS[tipo];
                const seleccionado = tiposSeleccionados.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => toggleTipo(tipo)}
                    className={`touch-btn p-2.5 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer ${
                      seleccionado
                        ? 'bg-slate-800 border-blue-500/60 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <div className="text-blue-400 shrink-0">
                      {seleccionado ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
                      <VehiculoIcono tipo={tipo} className={`w-3.5 h-3.5 ${info.color}`} />
                    </div>
                    <span className={`text-xs font-bold truncate ${seleccionado ? 'text-white' : 'text-slate-400'}`}>
                      {info.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="touch-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="touch-btn px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
