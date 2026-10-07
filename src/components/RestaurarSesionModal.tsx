import React, { useState } from 'react';
import { X, RotateCcw, Play, FileText, Settings2, Calendar, MapPin, Users, CheckCircle2 } from 'lucide-react';
import type { SesionConteo } from '../types/conteo';

interface RestaurarSesionModalProps {
  abierto: boolean;
  sesion: SesionConteo | null;
  onCerrar: () => void;
  onConfirmarRestaurar: (sesion: SesionConteo, continuarConteo: boolean) => Promise<void> | void;
  onAbrirEditar?: (sesion: SesionConteo) => void;
}

export const RestaurarSesionModal: React.FC<RestaurarSesionModalProps> = ({
  abierto,
  sesion,
  onCerrar,
  onConfirmarRestaurar,
  onAbrirEditar
}) => {
  const [procesando, setProcesando] = useState(false);

  if (!abierto || !sesion) return null;

  const handleRestaurar = async (continuarConteo: boolean) => {
    setProcesando(true);
    try {
      await onConfirmarRestaurar(sesion, continuarConteo);
      onCerrar();
    } catch (err) {
      console.error('Error al restaurar sesión:', err);
    } finally {
      setProcesando(false);
    }
  };

  const fechaInicioStr = new Date(sesion.fechaCreacion).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const fechaCierreStr = sesion.fechaCierre
    ? new Date(sesion.fechaCierre).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl relative text-left my-8">
        <button
          onClick={onCerrar}
          disabled={procesando}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white">
              Restaurar Sesión de Aforo
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reactiva esta sesión para realizar ajustes o continuar el conteo en vivo.
            </p>
          </div>
        </div>

        {/* Tarjeta de resumen de la sesión */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 mb-4">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>{sesion.nombre}</span>
          </div>

          {sesion.ubicacion && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{sesion.ubicacion}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
              <span>Inicio: {fechaInicioStr}</span>
            </div>
            {fechaCierreStr && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-rose-400 shrink-0" />
                <span>Cierre: {fechaCierreStr}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <Users className="w-3 h-3 text-blue-400 shrink-0" />
              <span>
                Equipo: {sesion.participantes?.length || 1} participante(s) ({sesion.usuario})
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 mb-6 leading-relaxed">
          Al restaurar, la sesión pasará inmediatamente a estado <strong>abierta</strong> para todo el equipo.
          Podrás reanudar el aforo en campo, modificar eventos en la bitácora o ajustar los parámetros de la sesión.
        </div>

        {/* Botones de acción */}
        <div className="space-y-2.5">
          {/* Opción 1: Restaurar y Continuar Conteo */}
          <button
            type="button"
            disabled={procesando}
            onClick={() => handleRestaurar(true)}
            className="touch-btn w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>Restaurar y Continuar Conteo en Vivo</span>
            </div>
            <span className="text-[11px] opacity-80 hidden sm:inline">Pasa a la pantalla de conteo</span>
          </button>

          {/* Opción 2: Restaurar para Ajustes / Bitácora */}
          <button
            type="button"
            disabled={procesando}
            onClick={() => handleRestaurar(false)}
            className="touch-btn w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-between transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Restaurar y Ver Bitácora de Eventos</span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">Para correcciones o eventos manuales</span>
          </button>

          {/* Opción 3: Editar datos de la sesión */}
          {onAbrirEditar && (
            <button
              type="button"
              disabled={procesando}
              onClick={() => {
                onCerrar();
                onAbrirEditar(sesion);
              }}
              className="touch-btn w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-slate-800/60 hover:bg-slate-800 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Settings2 className="w-4 h-4 shrink-0" />
              <span>Editar Configuración de la Sesión (Nombre, Tipos)</span>
            </button>
          )}

          <div className="pt-2 text-right">
            <button
              type="button"
              disabled={procesando}
              onClick={onCerrar}
              className="touch-btn text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
