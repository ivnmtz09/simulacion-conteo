import React from 'react';
import { Footprints, TriangleAlert, ShieldCheck } from 'lucide-react';
import type { EventoConteo, CategoriaSalidaPeaton } from '../types/conteo';
import { TIPOS_VEHICULOS } from '../types/conteo';

interface PeatonBloqueConteoProps {
  sesionId: string;
  usuario: string;
  onRegistrarEvento: (nuevoEvento: Omit<EventoConteo, 'id'>) => Promise<void>;
  eventosPeaton: EventoConteo[];
}

export const PeatonBloqueConteo: React.FC<PeatonBloqueConteoProps> = ({
  sesionId,
  usuario,
  onRegistrarEvento,
  eventosPeaton
}) => {
  const info = TIPOS_VEHICULOS['peaton'];

  // Métricas (excluyendo papelera)
  const countCebra = eventosPeaton.filter((e) => e.categoriaSalida === 'cebra' && !e.enPapelera).length;
  const countFueraCebra = eventosPeaton.filter((e) => e.categoriaSalida === 'fuera_cebra' && !e.enPapelera).length;
  const countAnden = eventosPeaton.filter((e) => e.categoriaSalida === 'anden' && !e.enPapelera).length;
  const totalPeatones = countCebra + countFueraCebra + countAnden;

  const vibrar = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch {
        // Ignorar
      }
    }
  };

  const handleCrucePeaton = async (categoria: CategoriaSalidaPeaton) => {
    vibrar();
    const ahoraMs = Date.now();
    const nuevoEvento: Omit<EventoConteo, 'id'> = {
      sesionId,
      usuario,
      tipoVehiculo: 'peaton',
      tipoRegistro: 'peaton',
      categoriaSalida: categoria,
      timestampCreacion: ahoraMs
    };

    await onRegistrarEvento(nuevoEvento);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition hover:border-slate-700/80">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl select-none leading-none" role="img" aria-label="Peatón">
              🚶
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-extrabold tracking-tight ${info.color}`}>
                  {info.nombre}
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Sin cola
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                {info.subtitulo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 font-mono">
            <span className="text-xs text-slate-400">Total:</span>
            <span className="text-base font-extrabold text-white">{totalPeatones}</span>
          </div>
        </div>

        {/* 3 BOTONES DE CONTEO PEATONAL */}
        <div className="mt-4 space-y-2.5">
          {/* 1. Cruza por cebra */}
          <button
            type="button"
            onClick={() => handleCrucePeaton('cebra')}
            className="touch-btn w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-md shadow-emerald-600/20 flex items-center justify-between active:scale-95 border border-emerald-400/30"
          >
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base">
              <span className="text-xl select-none leading-none">🦓</span>
              <ShieldCheck className="w-6 h-6 text-emerald-200 shrink-0" />
              <span>Cruza por cebra</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-black/20 text-emerald-100 font-semibold">
                Seguro
              </span>
              <span className="text-base font-extrabold font-mono px-2 py-0.5 bg-white/20 rounded-lg">
                {countCebra}
              </span>
            </div>
          </button>

          {/* 2. Cruza fuera de cebra (imprudente) */}
          <button
            type="button"
            onClick={() => handleCrucePeaton('fuera_cebra')}
            className="touch-btn w-full py-4 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-600/20 flex items-center justify-between active:scale-95 border border-amber-300/30"
          >
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base">
              <TriangleAlert className="w-6 h-6 text-slate-950 shrink-0" />
              <span>Cruza fuera de cebra (imprudente)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-black/20 text-slate-900 font-semibold">
                Riesgo
              </span>
              <span className="text-base font-extrabold font-mono px-2 py-0.5 bg-black/20 rounded-lg text-slate-950">
                {countFueraCebra}
              </span>
            </div>
          </button>

          {/* 3. Pasa por andén/acera */}
          <button
            type="button"
            onClick={() => handleCrucePeaton('anden')}
            className="touch-btn w-full py-4 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 shadow-md flex items-center justify-between active:scale-95"
          >
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base">
              <Footprints className="w-6 h-6 text-blue-400 shrink-0" />
              <span>Pasa por andén/acera</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                Flujo
              </span>
              <span className="text-base font-extrabold font-mono px-2 py-0.5 bg-slate-700 rounded-lg text-white">
                {countAnden}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Resumen porcentual */}
      <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <span>Respeto al paso peatonal:</span>
        <span className="font-bold text-emerald-400 font-mono">
          {totalPeatones > 0 ? `${((countCebra / totalPeatones) * 100).toFixed(1)}%` : '0%'}
        </span>
      </div>
    </div>
  );
};
