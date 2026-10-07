import React, { useState } from 'react';
import { X, StopCircle, Building2 } from 'lucide-react';
import type { SesionAforoUni, MetricasAforoUni } from '../../types/aforoUniversitario';

interface FinalizarSesionUniModalProps {
  abierto: boolean;
  sesion: SesionAforoUni | null;
  metricas: MetricasAforoUni;
  onCerrar: () => void;
  onConfirmarFinalizar: () => Promise<void>;
}

export const FinalizarSesionUniModal: React.FC<FinalizarSesionUniModalProps> = ({
  abierto,
  sesion,
  metricas,
  onCerrar,
  onConfirmarFinalizar
}) => {
  const [cerrando, setCerrando] = useState(false);

  if (!abierto || !sesion) return null;

  const handleFinalizar = async () => {
    setCerrando(true);
    try {
      await onConfirmarFinalizar();
      onCerrar();
    } catch (err) {
      console.error('Error al finalizar sesión de aforo:', err);
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4">
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <StopCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Finalizar Conteo de Bloque</h2>
            <p className="text-xs text-slate-400">¿Deseas cerrar esta sesión de medición?</p>
          </div>
        </div>

        {/* Resumen ejecutivo de la medición */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate">{sesion.nombre}</span>
            <span className="text-[10px] text-slate-400">({sesion.bloque})</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Total Entradas:</span>
              <p className="text-emerald-400 font-bold font-mono text-base">+{metricas.totalEntradas}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Total Salidas:</span>
              <p className="text-rose-400 font-bold font-mono text-base">-{metricas.totalSalidas}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Volumen Transitado:</span>
              <p className="text-blue-400 font-bold font-mono text-base">{metricas.volumenTransito}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Aforo Pico:</span>
              <p className="text-amber-400 font-bold font-mono text-base">{metricas.aforoPico}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Aforo remanente al cerrar:</span>
            <span className="font-mono font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-lg">
              {metricas.aforoActual} personas
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          La sesión se marcará como cerrada y quedará guardada en el historial para consulta y descarga de reportes en Excel / CSV.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Continuar contando
          </button>
          <button
            type="button"
            disabled={cerrando}
            onClick={handleFinalizar}
            className="touch-btn px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <StopCircle className="w-4 h-4" />
            <span>{cerrando ? 'Finalizando...' : 'Sí, Finalizar Sesión'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
