import React, { useState } from 'react';
import {
  UserPlus,
  UserMinus,
  RotateCcw,
  SlidersHorizontal,
  Check,
  DoorOpen,
  MapPin,
  Delete,
  X,
  Zap,
  Users2
} from 'lucide-react';
import type { TipoTransitoUni } from '../../types/aforoUniversitario';
import { obtenerPuertasPorBloque } from '../../types/aforoUniversitario';

interface ControlesConteoTouchProps {
  onRegistrar: (tipo: TipoTransitoUni, cantidad: number, puerta?: string) => void;
  onDeshacerUltimo: () => void;
  onAjustarAforoManual: (nuevoAforo: number) => void;
  puedeDeshacer: boolean;
  aforoActual: number;
  bloqueado?: boolean;
  bloque?: string;
  puertaActiva: string;
  onCambiarPuerta: (puerta: string) => void;
}

export const ControlesConteoTouch: React.FC<ControlesConteoTouchProps> = ({
  onRegistrar,
  onDeshacerUltimo,
  onAjustarAforoManual,
  puedeDeshacer,
  aforoActual,
  bloqueado = false,
  bloque = 'Bloque 1',
  puertaActiva,
  onCambiarPuerta
}) => {
  const [modalAjusteAbierto, setModalAjusteAbierto] = useState(false);
  const [keypadInput, setKeypadInput] = useState(String(aforoActual));
  const [ultimoClick, setUltimoClick] = useState<{
    tipo: TipoTransitoUni;
    cant: number;
    id: number;
  } | null>(null);

  const puertasDisponibles = obtenerPuertasPorBloque(bloque);

  // Helper hápico
  const vibrar = (patron: number | number[]) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(patron);
      }
    } catch {
      // Ignorar si el navegador o dispositivo no soporta vibración
    }
  };

  const ejecutarAccion = (tipo: TipoTransitoUni, cant: number, puertaEspecial?: string) => {
    if (bloqueado) return;
    vibrar(25);

    const puertaUsada = puertaEspecial || puertaActiva;
    const clickId = Date.now();
    setUltimoClick({ tipo, cant, id: clickId });
    setTimeout(() => {
      setUltimoClick((curr) => (curr?.id === clickId ? null : curr));
    }, 280);

    onRegistrar(tipo, cant, puertaUsada);
  };

  const handleDeshacer = () => {
    if (!puedeDeshacer || bloqueado) return;
    // Vibración hápica distintiva para rollback
    vibrar([30, 50, 30]);
    onDeshacerUltimo();
  };

  // Manejo del teclado numérico moderno para ajuste manual
  const handleKeypadPress = (tecla: string) => {
    vibrar(20);
    if (tecla === 'clear') {
      setKeypadInput('0');
      return;
    }
    if (tecla === 'backspace') {
      setKeypadInput((prev) => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
      return;
    }

    setKeypadInput((prev) => {
      if (prev === '0' || prev === '') return tecla;
      if (prev.length >= 5) return prev; // Límite de 5 dígitos razonable
      return prev + tecla;
    });
  };

  const handleAplicarPreset = (delta: number) => {
    vibrar(20);
    setKeypadInput((prev) => {
      const actual = parseInt(prev, 10) || 0;
      const nuevo = Math.max(0, actual + delta);
      return String(nuevo);
    });
  };

  const handleGuardarAjuste = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(keypadInput, 10);
    if (!isNaN(num) && num >= 0) {
      vibrar([40, 60, 40]);
      onAjustarAforoManual(num);
      setModalAjusteAbierto(false);
    }
  };

  const abrirModalAjuste = () => {
    setKeypadInput(String(aforoActual));
    setModalAjusteAbierto(true);
  };

  const nuevoValorNum = parseInt(keypadInput, 10) || 0;
  const diferenciaAjuste = nuevoValorNum - aforoActual;

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* 1. PASTILLAS TÁCTILES RÁPIDAS: SELECTOR DE ACCESO / PUERTAS */}
      {/* ============================================================ */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-3.5 sm:p-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-white tracking-wide flex items-center gap-2">
                <span>Punto de Acceso Monitoreado</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800/90 text-blue-300 border border-slate-700/80 shadow-sm">
                  {bloque}
                </span>
              </span>
              <p className="text-[11px] text-slate-400">
                Toca una pastilla para cambiar la puerta activa de tu dispositivo
              </p>
            </div>
          </div>

          <div className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[170px] sm:max-w-none">
              Activa: <strong>{puertaActiva}</strong>
            </span>
          </div>
        </div>

        {/* Píldoras de selección táctil de alta visibilidad */}
        <div
          className={`grid gap-2 ${
            puertasDisponibles.length > 2
              ? 'grid-cols-2 sm:grid-cols-4'
              : 'grid-cols-2'
          }`}
        >
          {puertasDisponibles.map((puerta) => {
            const esSeleccionada = puertaActiva === puerta;
            const esLateral = puerta.toLowerCase().includes('lateral');

            return (
              <button
                key={puerta}
                type="button"
                disabled={bloqueado}
                onClick={() => {
                  vibrar(20);
                  onCambiarPuerta(puerta);
                }}
                className={`touch-btn relative py-3 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer select-none overflow-hidden ${
                  esSeleccionada
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white border-blue-400/80 shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50 scale-[1.02]'
                    : 'bg-slate-950/70 hover:bg-slate-800/80 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Glow de fondo si está activa */}
                {esSeleccionada && (
                  <span className="absolute inset-0 bg-white/10 opacity-40 animate-pulse pointer-events-none" />
                )}

                <span
                  className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
                    esSeleccionada
                      ? 'bg-white ring-2 ring-white/50 scale-125'
                      : esLateral
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="truncate">{puerta.replace('Entrada ', '')}</span>
                {esLateral && !esSeleccionada && (
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                    Lat
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. PANELES MASIVOS CON ERGONOMÍA DE PULGAR (+ / -)          */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PANEL DE ENTRADAS (+) - OBSIDIAN EMERALD */}
        <div className="relative bg-gradient-to-b from-emerald-950/50 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-2xl shadow-emerald-950/30 overflow-hidden">
          {/* Luz ambiental sutil */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Header del Panel */}
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                Ingreso al Bloque
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                {puertaActiva.replace('Entrada ', '').toUpperCase()}
              </span>
            </div>

            {/* BOTÓN HERO MASIVO +1 */}
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => ejecutarAccion('entrada', 1)}
              className={`touch-btn w-full py-9 sm:py-11 rounded-3xl font-black text-white shadow-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 relative overflow-hidden select-none active:scale-[0.96] ${
                ultimoClick?.tipo === 'entrada' && ultimoClick?.cant === 1
                  ? 'bg-emerald-400 ring-4 ring-emerald-300 shadow-emerald-400/60 scale-[0.98]'
                  : 'bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-emerald-700/40 border border-emerald-400/30'
              }`}
            >
              {/* Resplandor reflectivo */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

              <div className="flex items-center justify-center gap-3">
                <UserPlus className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md" />
                <span className="text-4xl sm:text-5xl font-mono tracking-tight drop-shadow-md">
                  +1
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-emerald-100">
                  Registrar Entrada
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-200 border border-emerald-400/30">
                  {puertaActiva.replace('Entrada ', '')}
                </span>
              </div>
            </button>

            {/* Ráfagas de grupo +5 y +10 */}
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => ejecutarAccion('entrada', 5)}
                className={`touch-btn py-3.5 rounded-2xl font-black text-emerald-200 border border-emerald-600/40 shadow-md flex items-center justify-center gap-2 transition cursor-pointer select-none active:scale-[0.96] ${
                  ultimoClick?.tipo === 'entrada' && ultimoClick?.cant === 5
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                    : 'bg-emerald-900/40 hover:bg-emerald-800/60'
                }`}
              >
                <Users2 className="w-4 h-4 text-emerald-400" />
                <span className="text-base font-mono font-black">+5</span>
                <span className="text-[11px] font-semibold text-emerald-300/90 uppercase tracking-tight">
                  Grupo
                </span>
              </button>

              <button
                type="button"
                disabled={bloqueado}
                onClick={() => ejecutarAccion('entrada', 10)}
                className={`touch-btn py-3.5 rounded-2xl font-black text-emerald-200 border border-emerald-600/40 shadow-md flex items-center justify-center gap-2 transition cursor-pointer select-none active:scale-[0.96] ${
                  ultimoClick?.tipo === 'entrada' && ultimoClick?.cant === 10
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                    : 'bg-emerald-900/40 hover:bg-emerald-800/60'
                }`}
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-base font-mono font-black">+10</span>
                <span className="text-[11px] font-semibold text-emerald-300/90 uppercase tracking-tight">
                  Flujo Alto
                </span>
              </button>
            </div>
          </div>

          {/* Atajos directos por puerta para entrada */}
          <div className="mt-4 pt-3 border-t border-emerald-500/20">
            <span className="text-[10px] uppercase font-extrabold text-emerald-400/90 tracking-wider block mb-2">
              Ingreso directo de 1 persona por puerta:
            </span>
            <div
              className={`grid gap-2 ${
                puertasDisponibles.length > 2 ? 'grid-cols-2' : 'grid-cols-2'
              }`}
            >
              {puertasDisponibles.map((p) => {
                const esActiva = puertaActiva === p;
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={bloqueado}
                    onClick={() => ejecutarAccion('entrada', 1, p)}
                    className={`touch-btn py-2.5 px-2.5 rounded-xl text-xs font-black border shadow-sm flex items-center justify-center gap-2 transition cursor-pointer select-none active:scale-[0.96] ${
                      esActiva
                        ? 'bg-emerald-600/50 hover:bg-emerald-600/70 text-white border-emerald-400 shadow-emerald-500/20'
                        : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 border-emerald-700/40'
                    }`}
                    title={`Contar 1 persona ingresando por ${p}`}
                  >
                    <span className="text-emerald-300 font-mono font-black text-sm">
                      +1
                    </span>
                    <span className="truncate text-[11px]">
                      {p.replace('Entrada ', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* PANEL DE SALIDAS (-) - OBSIDIAN ROSE */}
        <div className="relative bg-gradient-to-b from-rose-950/50 via-slate-900 to-slate-950 border border-rose-500/30 rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-2xl shadow-rose-950/30 overflow-hidden">
          {/* Luz ambiental sutil */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Header del Panel */}
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
                Egreso del Bloque
              </span>
              <span className="text-[11px] font-mono font-bold text-rose-300 bg-rose-500/15 px-2.5 py-0.5 rounded-lg border border-rose-500/30">
                {puertaActiva.replace('Entrada ', '').toUpperCase()}
              </span>
            </div>

            {/* BOTÓN HERO MASIVO -1 */}
            <button
              type="button"
              disabled={bloqueado}
              onClick={() => ejecutarAccion('salida', 1)}
              className={`touch-btn w-full py-9 sm:py-11 rounded-3xl font-black text-white shadow-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 relative overflow-hidden select-none active:scale-[0.96] ${
                ultimoClick?.tipo === 'salida' && ultimoClick?.cant === 1
                  ? 'bg-rose-400 ring-4 ring-rose-300 shadow-rose-400/60 scale-[0.98]'
                  : 'bg-gradient-to-br from-rose-600 via-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-rose-700/40 border border-rose-400/30'
              }`}
            >
              {/* Resplandor reflectivo */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

              <div className="flex items-center justify-center gap-3">
                <UserMinus className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md" />
                <span className="text-4xl sm:text-5xl font-mono tracking-tight drop-shadow-md">
                  -1
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-rose-100">
                  Registrar Salida
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-950/50 text-rose-200 border border-rose-400/30">
                  {puertaActiva.replace('Entrada ', '')}
                </span>
              </div>
            </button>

            {/* Ráfagas de grupo -5 y -10 */}
            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                type="button"
                disabled={bloqueado}
                onClick={() => ejecutarAccion('salida', 5)}
                className={`touch-btn py-3.5 rounded-2xl font-black text-rose-200 border border-rose-600/40 shadow-md flex items-center justify-center gap-2 transition cursor-pointer select-none active:scale-[0.96] ${
                  ultimoClick?.tipo === 'salida' && ultimoClick?.cant === 5
                    ? 'bg-rose-500 text-white ring-2 ring-rose-300'
                    : 'bg-rose-900/40 hover:bg-rose-800/60'
                }`}
              >
                <Users2 className="w-4 h-4 text-rose-400" />
                <span className="text-base font-mono font-black">-5</span>
                <span className="text-[11px] font-semibold text-rose-300/90 uppercase tracking-tight">
                  Grupo
                </span>
              </button>

              <button
                type="button"
                disabled={bloqueado}
                onClick={() => ejecutarAccion('salida', 10)}
                className={`touch-btn py-3.5 rounded-2xl font-black text-rose-200 border border-rose-600/40 shadow-md flex items-center justify-center gap-2 transition cursor-pointer select-none active:scale-[0.96] ${
                  ultimoClick?.tipo === 'salida' && ultimoClick?.cant === 10
                    ? 'bg-rose-500 text-white ring-2 ring-rose-300'
                    : 'bg-rose-900/40 hover:bg-rose-800/60'
                }`}
              >
                <Zap className="w-4 h-4 text-rose-400" />
                <span className="text-base font-mono font-black">-10</span>
                <span className="text-[11px] font-semibold text-rose-300/90 uppercase tracking-tight">
                  Flujo Alto
                </span>
              </button>
            </div>
          </div>

          {/* Atajos directos por puerta para salida */}
          <div className="mt-4 pt-3 border-t border-rose-500/20">
            <span className="text-[10px] uppercase font-extrabold text-rose-400/90 tracking-wider block mb-2">
              Salida directa de 1 persona por puerta:
            </span>
            <div
              className={`grid gap-2 ${
                puertasDisponibles.length > 2 ? 'grid-cols-2' : 'grid-cols-2'
              }`}
            >
              {puertasDisponibles.map((p) => {
                const esActiva = puertaActiva === p;
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={bloqueado}
                    onClick={() => ejecutarAccion('salida', 1, p)}
                    className={`touch-btn py-2.5 px-2.5 rounded-xl text-xs font-black border shadow-sm flex items-center justify-center gap-2 transition cursor-pointer select-none active:scale-[0.96] ${
                      esActiva
                        ? 'bg-rose-600/50 hover:bg-rose-600/70 text-white border-rose-400 shadow-rose-500/20'
                        : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border-rose-700/40'
                    }`}
                    title={`Contar 1 persona saliendo por ${p}`}
                  >
                    <span className="text-rose-300 font-mono font-black text-sm">
                      -1
                    </span>
                    <span className="truncate text-[11px]">
                      {p.replace('Entrada ', '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. BARRA DE UTILIDADES: DESHACER (ROLLBACK) Y AJUSTE MANUAL */}
      {/* ============================================================ */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 p-3 rounded-3xl shadow-xl flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* BOTÓN DESHACER (ROLLBACK) DE ALTO ACCESO */}
        <button
          type="button"
          disabled={!puedeDeshacer || bloqueado}
          onClick={handleDeshacer}
          className={`touch-btn flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer select-none ${
            puedeDeshacer && !bloqueado
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/50 shadow-lg shadow-amber-500/10 active:scale-[0.97]'
              : 'bg-slate-800/40 text-slate-500 border border-slate-800/80 cursor-not-allowed opacity-50'
          }`}
          title="Deshacer el último registro contabilizado con confirmación háptica"
        >
          <RotateCcw
            className={`w-4 h-4 shrink-0 ${
              puedeDeshacer ? 'text-amber-400 animate-spin-reverse-once' : ''
            }`}
          />
          <div className="flex flex-col text-left leading-tight">
            <span>Deshacer Movimiento</span>
            <span className="text-[10px] font-normal text-amber-400/80">
              {puedeDeshacer ? 'Rollback disponible' : 'Sin registros previos'}
            </span>
          </div>
        </button>

        {/* AJUSTE MANUAL DE AFORO */}
        <button
          type="button"
          disabled={bloqueado}
          onClick={abrirModalAjuste}
          className="touch-btn flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition cursor-pointer select-none active:scale-[0.97]"
        >
          <SlidersHorizontal className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex flex-col text-left leading-tight">
            <span>Ajuste Manual de Aforo</span>
            <span className="text-[10px] font-mono text-slate-400">
              Actual: <strong className="text-white">{aforoActual}</strong>
            </span>
          </div>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 4. MODAL DE AJUSTE MANUAL CON TECLADO NUMÉRICO MODERNO      */}
      {/* ============================================================ */}
      {modalAjusteAbierto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800/90 rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Ajustar Ocupación de Bloque
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {bloque} • Sincronización en tiempo real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAjusteAbierto(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Display de valor actual y propuesto */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Nuevo Aforo Propuesto
              </span>
              <div className="text-4xl font-black font-mono tracking-tight text-white flex items-center justify-center gap-2">
                <span>{keypadInput || '0'}</span>
                <span className="text-sm font-sans font-medium text-slate-400">
                  personas
                </span>
              </div>

              {/* Comparador delta */}
              <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-center gap-2 text-xs">
                <span className="text-slate-400 font-mono">Actual: {aforoActual}</span>
                <span className="text-slate-600">•</span>
                <span
                  className={`font-mono font-bold ${
                    diferenciaAjuste > 0
                      ? 'text-emerald-400'
                      : diferenciaAjuste < 0
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {diferenciaAjuste > 0
                    ? `+${diferenciaAjuste} personas`
                    : diferenciaAjuste < 0
                    ? `${diferenciaAjuste} personas`
                    : 'Sin variación'}
                </span>
              </div>
            </div>

            {/* Atajos rápidos de incremento/decremento */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleAplicarPreset(10)}
                className="py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => handleAplicarPreset(50)}
                className="py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
              >
                +50
              </button>
              <button
                type="button"
                onClick={() => handleAplicarPreset(-10)}
                className="py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-rose-300 border border-slate-700 cursor-pointer"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('clear')}
                className="py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer"
              >
                Cero
              </button>
            </div>

            {/* Teclado numérico táctil (Keypad) */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleKeypadPress(d)}
                  className="touch-btn py-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 text-white font-mono font-bold text-lg border border-slate-700/50 shadow-sm active:scale-95 transition cursor-pointer"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeypadPress('clear')}
                className="touch-btn py-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider border border-slate-700/50 cursor-pointer"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="touch-btn py-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-700/80 text-white font-mono font-bold text-lg border border-slate-700/50 shadow-sm active:scale-95 transition cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('backspace')}
                className="touch-btn py-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-700/60 text-amber-400 font-bold flex items-center justify-center border border-slate-700/50 cursor-pointer"
                title="Borrar último dígito"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Acciones de confirmación */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalAjusteAbierto(false)}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarAjuste}
                className="touch-btn flex-1 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar ({keypadInput || '0'})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
