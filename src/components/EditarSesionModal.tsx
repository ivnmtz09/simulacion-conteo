import React, { useState } from 'react';
import { X, Tag, MapPin, CheckSquare, Square, AlertCircle, Save } from 'lucide-react';
import type { TipoVehiculo, SesionConteo } from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';
import { VehiculoIcono } from './VehiculoIcono';

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
  const [ubicacion, setUbicacion] = useState(sesion.ubicacion || '');
  const [tiposSeleccionados, setTiposSeleccionados] = useState<TipoVehiculo[]>(
    sesion.tiposSeleccionados || [...LISTA_TIPOS_VEHICULOS]
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

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

    setError(null);
    setGuardando(true);
    try {
      await onGuardar(sesion.id, {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || 'Intersección principal',
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative my-8 text-left">
        <button
          onClick={onCerrar}
          disabled={guardando}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>Ajustar Parámetros de la Sesión</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Modifica el nombre, intersección o los vehículos monitoreados en esta sesión.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Nombre (Día y fecha, ej: Lunes 06 de Octubre)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ubicación (Semáforo X)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ubicación (Semáforo X, ej: Semáforo 1 - Cra 8 con Cll 15)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Categorías de transporte monitoreadas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Vehículos y Peatones Monitoreados
              </label>
              <button
                type="button"
                onClick={seleccionarTodos}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline"
              >
                Seleccionar todos
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2.5">
              Marca las categorías que estarán activas en esta tanda de aforo:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LISTA_TIPOS_VEHICULOS.map((tipo) => {
                const info = TIPOS_VEHICULOS[tipo];
                const seleccionado = tiposSeleccionados.includes(tipo);
                return (
                  <div
                    key={tipo}
                    onClick={() => toggleTipo(tipo)}
                    className={`touch-btn cursor-pointer p-2.5 rounded-xl border flex items-center gap-3 transition active:scale-95 ${
                      seleccionado
                        ? 'bg-slate-800/90 border-blue-500/60 shadow-sm shadow-blue-500/10'
                        : 'bg-slate-800/40 border-slate-700/60 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="text-blue-400 shrink-0">
                      {seleccionado ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 shrink-0">
                      <VehiculoIcono tipo={tipo} className={`w-4 h-4 ${info.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-bold ${info.color}`}>
                        {info.nombre}
                      </span>
                      <p className="text-[10px] text-slate-400 truncate leading-tight">
                        {info.subtitulo}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={guardando}
              onClick={onCerrar}
              className="touch-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="touch-btn px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 flex items-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{guardando ? 'Guardando...' : 'Guardar Ajustes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
