import React, { useState, useRef, useEffect } from 'react';
import { Footprints, TriangleAlert, ShieldCheck, Undo2, X } from 'lucide-react';
import type { EventoConteo, CategoriaSalidaPeaton } from '../types/conteo';
import { TIPOS_VEHICULOS } from '../types/conteo';
import { VehiculoIcono } from './VehiculoIcono';
import { db, doc, updateDoc } from '../lib/firebase';

interface PeatonBloqueConteoProps {
  sesionId: string;
  usuario: string;
  onRegistrarEvento: (nuevoEvento: Omit<EventoConteo, 'id'>) => Promise<void>;
  onDeshacerEvento?: (eventoId: string) => Promise<void> | void;
  eventosPeaton: EventoConteo[];
}

interface MensajeToast {
  accion: string;
  detalle: string;
}

export const PeatonBloqueConteo: React.FC<PeatonBloqueConteoProps> = ({
  sesionId,
  usuario,
  onRegistrarEvento,
  onDeshacerEvento,
  eventosPeaton
}) => {
  const [animandoUndo, setAnimandoUndo] = useState(false);
  const [deshaciendo, setDeshaciendo] = useState(false);
  const [mensajeToast, setMensajeToast] = useState<MensajeToast | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const info = TIPOS_VEHICULOS['peaton'];

  // Métricas (excluyendo eventos en papelera)
  const countCebra = eventosPeaton.filter((e) => e.categoriaSalida === 'cebra' && !e.enPapelera).length;
  const countFueraCebra = eventosPeaton.filter((e) => e.categoriaSalida === 'fuera_cebra' && !e.enPapelera).length;
  const countAnden = eventosPeaton.filter((e) => e.categoriaSalida === 'anden' && !e.enPapelera).length;
  const totalPeatones = countCebra + countFueraCebra + countAnden;

  // Eventos activos ordenados cronológicamente para Deshacer (Undo)
  const eventosActivos = eventosPeaton
    .filter((e) => !e.enPapelera)
    .sort((a, b) => a.timestampCreacion - b.timestampCreacion);

  const ultimoEvento = eventosActivos.length > 0 ? eventosActivos[eventosActivos.length - 1] : null;

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Vibración háptica táctil de 25ms para el pulgar
  const vibrar = (duracion = 25) => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(duracion);
      } catch {
        // Ignorar si el dispositivo no admite vibración
      }
    }
  };

  const getDescripcionCrucePeaton = (evento: EventoConteo): MensajeToast => {
    switch (evento.categoriaSalida) {
      case 'cebra':
        return {
          accion: 'Cruce por cebra revertido',
          detalle: 'Se restó 1 al conteo seguro'
        };
      case 'fuera_cebra':
        return {
          accion: 'Cruce fuera de cebra revertido',
          detalle: 'Se restó 1 al cruce con riesgo'
        };
      case 'anden':
        return {
          accion: 'Paso por andén revertido',
          detalle: 'Se restó 1 al flujo peatonal'
        };
      default:
        return {
          accion: 'Cruce peatonal revertido',
          detalle: 'Evento enviado a papelera'
        };
    }
  };

  const handleCrucePeaton = async (categoria: CategoriaSalidaPeaton) => {
    vibrar(25);
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

  const handleDeshacer = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!ultimoEvento || !ultimoEvento.id || deshaciendo) return;

    const idParaDeshacer = ultimoEvento.id;
    vibrar(40);
    setAnimandoUndo(true);
    setTimeout(() => setAnimandoUndo(false), 350);

    const desc = getDescripcionCrucePeaton(ultimoEvento);
    setMensajeToast(desc);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setMensajeToast(null);
    }, 3200);

    setDeshaciendo(true);
    try {
      if (onDeshacerEvento) {
        await onDeshacerEvento(idParaDeshacer);
      } else if (!idParaDeshacer.startsWith('temp_')) {
        await updateDoc(doc(db, 'eventos', idParaDeshacer), { enPapelera: true });
      }
    } catch (err) {
      console.error('Error al deshacer cruce peatonal:', err);
    } finally {
      setDeshaciendo(false);
    }
  };

  const pctSeguro = totalPeatones > 0 ? ((countCebra / totalPeatones) * 100).toFixed(1) : '0';

  return (
    <div className="relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-slate-700/70 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between transition-all hover:border-slate-600/90">
      {/* Toast Flotante Destacado para Deshacer Inmediato */}
      {mensajeToast && (
        <div className="absolute top-3 left-3 right-3 z-30 bg-slate-950/95 border border-amber-400/80 text-amber-200 px-3.5 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-500/25 text-amber-300 shrink-0">
              <Undo2 className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="font-extrabold text-amber-300 text-xs truncate">{mensajeToast.accion}</p>
              <p className="text-[10px] text-slate-400 truncate">{mensajeToast.detalle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMensajeToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 shrink-0 text-xs cursor-pointer active:scale-95 transition-transform"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div>
        {/* ENCABEZADO CON ESTÉTICA OBSIDIAN GLASS Y BOTÓN DESHACER PROMINENTE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800/90 gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${info.badgeBg} ${info.color} flex items-center justify-center shrink-0 border ${info.badgeBorder} shadow-inner`}>
              <VehiculoIcono tipo="peaton" className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-black tracking-tight ${info.color}`}>
                  {info.nombre}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Flujo directo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none mt-1">
                {info.subtitulo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Total Peatones */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-slate-800 bg-slate-950/80 font-mono">
              <span className="text-xs text-slate-400 font-sans font-bold">Total:</span>
              <span className="text-base font-black text-white font-tabular">{totalPeatones}</span>
            </div>

            {/* Botón Deshacer Prominente */}
            <button
              type="button"
              disabled={!ultimoEvento || deshaciendo}
              onClick={handleDeshacer}
              title={ultimoEvento ? `Deshacer: ${getDescripcionCrucePeaton(ultimoEvento).accion}` : 'Sin cruces para deshacer'}
              aria-label="Deshacer último cruce peatonal"
              className={`touch-btn group h-10 px-3 rounded-2xl border flex items-center gap-1.5 transition-all cursor-pointer active:scale-90 shrink-0 ${
                ultimoEvento
                  ? 'bg-amber-500/25 text-amber-200 hover:bg-amber-500 hover:text-slate-950 border-amber-400/60 shadow-md shadow-amber-500/20 font-bold text-xs'
                  : 'bg-slate-800/20 border-slate-800/50 text-slate-600 cursor-not-allowed opacity-30 text-xs'
              }`}
            >
              <Undo2 className={`w-4 h-4 transition-transform duration-300 shrink-0 ${animandoUndo ? '-rotate-90 text-amber-300 scale-125' : ''}`} />
              <span className="hidden sm:inline">Deshacer</span>
            </button>
          </div>
        </div>

        {/* 3 BOTONES TÁCTILES ERGONÓMICOS DE ALTO IMPACTO */}
        <div className="mt-4 space-y-3">
          {/* 1. Cruza por cebra (Seguro) */}
          <button
            type="button"
            onClick={() => handleCrucePeaton('cebra')}
            className="touch-btn w-full min-h-[58px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-between active:scale-95 transition-all border border-emerald-400/40 cursor-pointer"
          >
            <div className="flex items-center gap-3 font-extrabold text-sm sm:text-base">
              <div className="p-2 rounded-xl bg-slate-950/30 text-emerald-200 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span>Cruza por cebra</span>
                <p className="text-[10px] text-emerald-100 font-normal">Paso seguro y señalizado</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/30 text-emerald-100 font-bold uppercase tracking-wider">
                Seguro
              </span>
              <span className="text-lg font-black font-mono font-tabular px-2.5 py-1 bg-white/20 rounded-xl shadow-inner">
                {countCebra}
              </span>
            </div>
          </button>

          {/* 2. Cruza fuera de cebra (imprudente) */}
          <button
            type="button"
            onClick={() => handleCrucePeaton('fuera_cebra')}
            className="touch-btn w-full min-h-[58px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-600/25 flex items-center justify-between active:scale-95 transition-all border border-amber-300/40 cursor-pointer"
          >
            <div className="flex items-center gap-3 font-extrabold text-sm sm:text-base">
              <div className="p-2 rounded-xl bg-slate-950/20 text-slate-950 shrink-0">
                <TriangleAlert className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span>Cruza fuera de cebra</span>
                <p className="text-[10px] text-slate-900 font-semibold">Cruce con riesgo en calzada</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/20 text-slate-900 font-bold uppercase tracking-wider">
                Riesgo
              </span>
              <span className="text-lg font-black font-mono font-tabular px-2.5 py-1 bg-slate-950/20 rounded-xl text-slate-950">
                {countFueraCebra}
              </span>
            </div>
          </button>

          {/* 3. Pasa por andén/acera */}
          <button
            type="button"
            onClick={() => handleCrucePeaton('anden')}
            className="touch-btn w-full min-h-[58px] py-3.5 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 shadow-md flex items-center justify-between active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 font-extrabold text-sm sm:text-base">
              <div className="p-2 rounded-xl bg-slate-700/60 text-blue-400 shrink-0">
                <Footprints className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span>Pasa por andén/acera</span>
                <p className="text-[10px] text-slate-400 font-normal">Tránsito peatonal longitudinal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-bold uppercase tracking-wider">
                Flujo
              </span>
              <span className="text-lg font-black font-mono font-tabular px-2.5 py-1 bg-slate-900/80 rounded-xl text-white border border-slate-700">
                {countAnden}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* RESUMEN PORCENTUAL Y RESPETO AL PASO PEATONAL */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Respeto al paso peatonal (cebra):</span>
        </span>
        <span className="font-black text-emerald-400 font-mono text-sm font-tabular">
          {pctSeguro}%
        </span>
      </div>
    </div>
  );
};
