import React from 'react';
import { X, Check, StopCircle } from 'lucide-react';
import type { SesionConteo } from '../types/conteo';
import { db, doc, updateDoc } from '../lib/firebase';

interface FinalizarSesionModalProps {
  abierto: boolean;
  sesion: SesionConteo | null;
  onCerrar: () => void;
  onSesionFinalizada: () => void;
}

export const FinalizarSesionModal: React.FC<FinalizarSesionModalProps> = ({
  abierto,
  sesion,
  onCerrar,
  onSesionFinalizada
}) => {
  if (!abierto || !sesion) return null;

  const handleConfirmar = async () => {
    const sesionId = sesion.id;
    // 1. Finalización optimista inmediata en local (0 ms de espera)
    onSesionFinalizada();
    onCerrar();

    // 2. Persistir en Firestore en segundo plano
    try {
      await updateDoc(doc(db, 'sesiones', sesionId), {
        activa: false,
        estado: 'cerrada',
        fechaCierre: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error al cerrar sesión en Firestore:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-center">
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 mb-4">
          <StopCircle className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-white">
          ¿Finalizar esta sesión de conteo?
        </h3>

        <div className="mt-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left">
          <div className="text-xs font-semibold text-slate-200">
            {sesion.nombre}
          </div>
          {sesion.ubicacion && (
            <div className="text-[11px] text-slate-400 mt-0.5">
              {sesion.ubicacion}
            </div>
          )}
        </div>

        <p className="text-xs text-rose-300 font-medium mt-3 leading-relaxed">
          No podrás seguir sumando eventos en ella. Se cerrará para todo el equipo y quedará archivada en el historial.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="touch-btn flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            className="touch-btn flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Sí, finalizar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
