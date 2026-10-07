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

  // Métricas (excluyendo papelera)
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

  const vibrar = (duracion = 40) => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(duracion);
      } catch {
        // Ignorar
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
    vibrar(35);
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
    vibrar(50);
    setAnimandoUndo(true);
    setTimeout(() => setAnimandoUndo(false), 350);

    const desc = getDescripcionCrucePeaton(ultimoEvento);
    setMensajeToast(desc);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setMensajeToast(null);
    }, 2800);

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

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition hover:border-slate-700/80">
      {/* Toast Flotante Temporal de Deshacer */}
      {mensajeToast && (
        <div className="absolute top-3 left-3 right-3 z-30 bg-slate-950/95 border border-amber-500/60 text-amber-200 px-3.5 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Undo2 className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="font-bold text-amber-300 text-xs truncate">{mensajeToast.accion}</p>
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
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${info.badgeBg} ${info.color} flex items-center justify-center shrink-0`}>
              <VehiculoIcono tipo="peaton" className="w-6 h-6" />
            </div>
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

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 font-mono">
              <span className="text-xs text-slate-400">Total:</span>
              <span className="text-base font-extrabold text-white">{totalPeatones}</span>
            </div>

            {/* Botón Deshacer solo icono con color vivo */}
            <button
              type="button"
              disabled={!ultimoEvento || deshaciendo}
              onClick={handleDeshacer}
              title={ultimoEvento ? `Deshacer: ${getDescripcionCrucePeaton(ultimoEvento).accion}` : 'Sin cruces para deshacer'}
              aria-label="Deshacer último cruce peatonal"
              className={`touch-btn group w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 ${
                ultimoEvento
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border-amber-500/40 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-800/30 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-30'
              }`}
            >
              <Undo2 className={`w-4 h-4 transition-transform duration-300 shrink-0 ${animandoUndo ? '-rotate-90 text-amber-300 scale-125' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3 BOTONES DE CONTEO PEATONAL */}
        <div className="mt-4 space-y-2.5">
          {/* 1. Cruza por cebra */}
          <button
            type="button"
            onClick={() => handleCrucePeaton('cebra')}
            className="touch-btn w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-md shadow-emerald-600/20 flex items-center justify-between active:scale-95 transition-transform border border-emerald-400/30 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base">
              <div className="p-1 rounded-lg bg-black/20 text-emerald-200 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
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
            className="touch-btn w-full py-4 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-600/20 flex items-center justify-between active:scale-95 transition-transform border border-amber-300/30 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base">
              <div className="p-1 rounded-lg bg-black/20 text-slate-950 shrink-0">
                <TriangleAlert className="w-6 h-6" />
              </div>
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
            className="touch-btn w-full py-4 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 shadow-md flex items-center justify-between active:scale-95 transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base">
              <div className="p-1 rounded-lg bg-slate-700/60 text-blue-400 shrink-0">
                <Footprints className="w-6 h-6" />
              </div>
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
