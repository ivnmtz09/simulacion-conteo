import React, { useState, useEffect } from 'react';
import { Timer, History, Square } from 'lucide-react';
import type { FaseSemaforo } from '../types/conteo';
import { db, collection, addDoc } from '../lib/firebase';

interface SemaforoCronometroProps {
  sesionId: string;
  usuario: string;
}

interface RegistroFase {
  fase: FaseSemaforo;
  duracionSeg: number;
  hora: string;
}

export const SemaforoCronometro: React.FC<SemaforoCronometroProps> = ({
  sesionId,
  usuario
}) => {
  const [faseActiva, setFaseActiva] = useState<FaseSemaforo | null>(null);
  const [timestampInicioFase, setTimestampInicioFase] = useState<number | null>(null);
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);
  const [historialFases, setHistorialFases] = useState<RegistroFase[]>([]);

  // Cronómetro en vivo de la fase activa
  useEffect(() => {
    if (!faseActiva || !timestampInicioFase) {
      return;
    }

    const interval = setInterval(() => {
      const transcurrido = Math.max(0, Math.floor((Date.now() - timestampInicioFase) / 1000));
      setSegundosTranscurridos(transcurrido);
    }, 500);

    return () => clearInterval(interval);
  }, [faseActiva, timestampInicioFase]);

  const cambiarFase = async (nuevaFase: FaseSemaforo) => {
    const ahoraMs = Date.now();

    // Si ya había una fase activa, guardar su duración en Firestore
    if (faseActiva && timestampInicioFase) {
      const duracion = Math.max(1, Math.round((ahoraMs - timestampInicioFase) / 1000));
      const registro: RegistroFase = {
        fase: faseActiva,
        duracionSeg: duracion,
        hora: new Date(ahoraMs).toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };

      setHistorialFases((prev) => [registro, ...prev.slice(0, 5)]);

      try {
        await addDoc(collection(db, 'ciclosSemaforo'), {
          sesionId,
          usuario,
          fase: faseActiva,
          duracionSeg: duracion,
          timestampInicio: timestampInicioFase,
          timestampFin: ahoraMs,
          timestampCreacion: ahoraMs
        });
      } catch (err) {
        console.warn('Error al guardar ciclo de semáforo:', err);
      }
    }

    // Iniciar nueva fase
    setFaseActiva(nuevaFase);
    setTimestampInicioFase(ahoraMs);
    setSegundosTranscurridos(0);
  };

  const detenerCronometro = async () => {
    if (faseActiva && timestampInicioFase) {
      const ahoraMs = Date.now();
      const duracion = Math.max(1, Math.round((ahoraMs - timestampInicioFase) / 1000));
      const registro: RegistroFase = {
        fase: faseActiva,
        duracionSeg: duracion,
        hora: new Date(ahoraMs).toLocaleTimeString('es-CO')
      };
      setHistorialFases((prev) => [registro, ...prev.slice(0, 5)]);

      try {
        await addDoc(collection(db, 'ciclosSemaforo'), {
          sesionId,
          usuario,
          fase: faseActiva,
          duracionSeg: duracion,
          timestampInicio: timestampInicioFase,
          timestampFin: ahoraMs,
          timestampCreacion: ahoraMs
        });
      } catch (err) {
        console.warn('Error al guardar ciclo de semáforo:', err);
      }
    }

    setFaseActiva(null);
    setTimestampInicioFase(null);
    setSegundosTranscurridos(0);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            {/* Ícono de Semáforo Miniatura */}
            <div className="w-4 h-8 bg-slate-950 rounded-md p-0.5 flex flex-col justify-between items-center border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${faseActiva === 'rojo' ? 'bg-rose-500 shadow-sm shadow-rose-500' : 'bg-rose-950'}`} />
              <span className={`w-2 h-2 rounded-full ${faseActiva === 'amarillo' ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-amber-950'}`} />
              <span className={`w-2 h-2 rounded-full ${faseActiva === 'verde' ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-emerald-950'}`} />
            </div>
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Cronometraje del Semáforo</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Ciclos Vissim
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Toca cada botón en el instante exacto que cambie la luz en campo
            </p>
          </div>
        </div>

        {/* Display de tiempo de fase actual */}
        {faseActiva ? (
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border font-mono font-bold flex items-center gap-1.5 ${
              faseActiva === 'verde'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : faseActiva === 'amarillo'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}>
              <Timer className="w-4 h-4 animate-spin" />
              <span className="text-sm uppercase font-black">{faseActiva}:</span>
              <span className="text-lg font-black">{segundosTranscurridos}s</span>
            </div>

            <button
              type="button"
              onClick={detenerCronometro}
              title="Detener cronometraje"
              className="touch-btn p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-medium">Inactivo</span>
        )}
      </div>

      {/* 3 BOTONES DE SEMÁFORO CON CÍRCULOS DE COLOR SÓLIDO */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 1. INICIA VERDE */}
        <button
          type="button"
          onClick={() => cambiarFase('verde')}
          className={`touch-btn py-4 px-3 rounded-xl border flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md ${
            faseActiva === 'verde'
              ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400 shadow-emerald-500/30'
              : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100 hover:border-emerald-500/50'
          }`}
        >
          {/* Círculo verde sólido */}
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="#10b981"
              stroke="#059669"
              strokeWidth="2"
            />
          </svg>
          <div className="text-left">
            <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              Inicia verde
            </div>
            {faseActiva === 'verde' && (
              <span className="text-[10px] font-mono font-bold text-emerald-200">
                Corriendo: {segundosTranscurridos}s
              </span>
            )}
          </div>
        </button>

        {/* 2. INICIA AMARILLO */}
        <button
          type="button"
          onClick={() => cambiarFase('amarillo')}
          className={`touch-btn py-4 px-3 rounded-xl border flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md ${
            faseActiva === 'amarillo'
              ? 'bg-amber-600 text-slate-950 border-amber-300 ring-2 ring-amber-300 shadow-amber-500/30 font-black'
              : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100 hover:border-amber-500/50'
          }`}
        >
          {/* Círculo amarillo sólido */}
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="#f59e0b"
              stroke="#d97706"
              strokeWidth="2"
            />
          </svg>
          <div className="text-left">
            <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              Inicia amarillo
            </div>
            {faseActiva === 'amarillo' && (
              <span className="text-[10px] font-mono font-bold text-slate-950">
                Corriendo: {segundosTranscurridos}s
              </span>
            )}
          </div>
        </button>

        {/* 3. INICIA ROJO */}
        <button
          type="button"
          onClick={() => cambiarFase('rojo')}
          className={`touch-btn py-4 px-3 rounded-xl border flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md ${
            faseActiva === 'rojo'
              ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-400 shadow-rose-500/30'
              : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-100 hover:border-rose-500/50'
          }`}
        >
          {/* Círculo rojo sólido */}
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="#ef4444"
              stroke="#dc2626"
              strokeWidth="2"
            />
          </svg>
          <div className="text-left">
            <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
              Inicia rojo
            </div>
            {faseActiva === 'rojo' && (
              <span className="text-[10px] font-mono font-bold text-rose-200">
                Corriendo: {segundosTranscurridos}s
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Historial reciente de fases guardadas */}
      {historialFases.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Últimos ciclos registrados:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap font-mono">
            {historialFases.slice(0, 3).map((h, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                  h.fase === 'verde'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : h.fase === 'amarillo'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {h.fase.toUpperCase()}: {h.duracionSeg}s
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
