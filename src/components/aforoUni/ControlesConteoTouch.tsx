import React, { useState } from 'react';
import { UserPlus, UserMinus, RotateCcw, SlidersHorizontal, Check } from 'lucide-react';
import type { TipoTransitoUni } from '../../types/aforoUniversitario';

interface ControlesConteoTouchProps {
  onRegistrar: (tipo: TipoTransitoUni, cantidad: number) => void;
  onDeshacerUltimo: () => void;
  onAjustarAforoManual: (nuevoAforo: number) => void;
  puedeDeshacer: boolean;
  aforoActual: number;
  bloqueado?: boolean;
}

export const ControlesConteoTouch: React.FC<ControlesConteoTouchProps> = ({
  onRegistrar,
  onDeshacerUltimo,
  onAjustarAforoManual,
  puedeDeshacer,
  aforoActual,
  bloqueado = false
}) => {
  const [modalAjusteAbierto, setModalAjusteAbierto] = useState(false);
  const [valorAjuste, setValorAjuste] = useState(String(aforoActual));
  const [ultimoClick, setUltimoClick] = useState<{ tipo: TipoTransitoUni; cant: number } | null>(null);

  const ejecutarAccion = (tipo: TipoTransitoUni, cant: number) => {
    if (bloqueado) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } catch {
      // Ignorar si no soporta vibración
    }

    setUltimoClick({ tipo, cant });
    setTimeout(() => setUltimoClick(null), 300);
    onRegistrar(tipo, cant);
  };

  const handleGuardarAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(valorAjuste, 10);
    if (!isNaN(num) && num >= 0) {
      onAjustarAforoManual(num);
      setModalAjusteAbierto(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botones masivos de Entrada y Salida */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* PANEL ENTRADAS (+) */}
        <div className="bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xl shadow-emerald-950/20">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              Ingreso al Bloque
            </span>
            <span className="text-xs font-mono text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              ENTRADAS (+)
            </span>
          </div>

          {/* Botón principal +1 */}
          <button
            type="button"
            disabled={bloqueado}
            onClick={() => ejecutarAccion('entrada', 1)}
            className={`touch-btn w-full py-8 sm:py-10 rounded-2xl font-black text-2xl sm:text-3xl text-white shadow-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative overflow-hidden active:scale-95 ${
              ultimoClick?.tipo === 'entrada' && ultimoClick?.cant === 1
                ? 'bg-emerald-400 scale-95 ring-4 ring-emerald-300'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-700/40'
            }`}
          >
            <UserPlus className="w-9 h-9 sm:w-11 sm:h-11" />
            <div className="flex items-center gap-1.5 leading-none">
              <span>+1</span>
              <span className="text-sm font-bold opacity-90 tracking-wide uppercase">Entrada</span>
            </div>
            <span className="text-[11px] font-normal text-emerald-100/80 mt-0.5">Toca para contar 1 persona ingresando</span>
          </button>

          {/* Atajos de grupos +5 y +10 */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => ejecutarAccion('entrada', 5)}
              className="touch-btn py-3 rounded-xl font-extrabold text-sm bg-emerald-800/40 hover:bg-emerald-700/60 text-emerald-200 border border-emerald-600/40 shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>+5</span>
              <span className="text-xs font-semibold text-emerald-300">Grupo</span>
            </button>
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => ejecutarAccion('entrada', 10)}
              className="touch-btn py-3 rounded-xl font-extrabold text-sm bg-emerald-800/40 hover:bg-emerald-700/60 text-emerald-200 border border-emerald-600/40 shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>+10</span>
              <span className="text-xs font-semibold text-emerald-300">Salón</span>
            </button>
          </div>
        </div>

        {/* PANEL SALIDAS (-) */}
        <div className="bg-gradient-to-b from-rose-950/40 to-slate-900 border border-rose-500/30 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xl shadow-rose-950/20">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-rose-400 font-extrabold text-xs uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              Egreso del Bloque
            </span>
            <span className="text-xs font-mono text-rose-300/80 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
              SALIDAS (-)
            </span>
          </div>

          {/* Botón principal -1 */}
          <button
            type="button"
            disabled={bloqueado}
            onClick={() => ejecutarAccion('salida', 1)}
            className={`touch-btn w-full py-8 sm:py-10 rounded-2xl font-black text-2xl sm:text-3xl text-white shadow-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative overflow-hidden active:scale-95 ${
              ultimoClick?.tipo === 'salida' && ultimoClick?.cant === 1
                ? 'bg-rose-400 scale-95 ring-4 ring-rose-300'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-700/40'
            }`}
          >
            <UserMinus className="w-9 h-9 sm:w-11 sm:h-11" />
            <div className="flex items-center gap-1.5 leading-none">
              <span>-1</span>
              <span className="text-sm font-bold opacity-90 tracking-wide uppercase">Salida</span>
            </div>
            <span className="text-[11px] font-normal text-rose-100/80 mt-0.5">Toca para contar 1 persona saliendo</span>
          </button>

          {/* Atajos de grupos -5 y -10 */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => ejecutarAccion('salida', 5)}
              className="touch-btn py-3 rounded-xl font-extrabold text-sm bg-rose-800/40 hover:bg-rose-700/60 text-rose-200 border border-rose-600/40 shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>-5</span>
              <span className="text-xs font-semibold text-rose-300">Grupo</span>
            </button>
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => ejecutarAccion('salida', 10)}
              className="touch-btn py-3 rounded-xl font-extrabold text-sm bg-rose-800/40 hover:bg-rose-700/60 text-rose-200 border border-rose-600/40 shadow-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>-10</span>
              <span className="text-xs font-semibold text-rose-300">Salón</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de utilidades: Deshacer y Ajuste manual */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl flex-wrap">
        <button
          type="button"
          disabled={!puedeDeshacer || bloqueado}
          onClick={onDeshacerUltimo}
          className={`touch-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
            puedeDeshacer && !bloqueado
              ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40'
              : 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed opacity-50'
          }`}
          title="Deshacer el último registro contabilizado"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Deshacer último movimiento</span>
        </button>

        <button
          type="button"
          disabled={bloqueado}
          onClick={() => {
            setValorAjuste(String(aforoActual));
            setModalAjusteAbierto(true);
          }}
          className="touch-btn flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span>Ajustar ocupación inicial ({aforoActual})</span>
        </button>
      </div>

      {/* Modal de ajuste manual de aforo */}
      {modalAjusteAbierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span>Ajustar Ocupación del Bloque</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Utilízalo si al iniciar el turno ya había un número conocido de personas dentro del bloque.
              </p>
            </div>

            <form onSubmit={handleGuardarAjuste} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Número de personas actualmente dentro:
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={valorAjuste}
                  onChange={(e) => setValorAjuste(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAjusteAbierto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="touch-btn px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aplicar Ajuste</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
