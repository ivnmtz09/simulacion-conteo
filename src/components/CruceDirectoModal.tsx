import React, { useState, useEffect } from 'react';
import { X, Zap, Check } from 'lucide-react';
import type { TipoVehiculo, EventoConteo } from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';
import {
  calcularEstadoSemaforo,
  mapearFaseACategoria,
  obtenerInfoFase,
  DURACION_CICLO_SEG
} from '../lib/semaforoUtils';

interface CruceDirectoModalProps {
  abierto: boolean;
  tipoInicial?: TipoVehiculo;
  tiposDisponibles?: TipoVehiculo[];
  sesionId: string;
  usuario: string;
  inicioCicloSemaforo?: number | null;
  onCerrar: () => void;
  onRegistrarEvento: (nuevoEvento: Omit<EventoConteo, 'id'>) => Promise<void>;
}

export const CruceDirectoModal: React.FC<CruceDirectoModalProps> = ({
  abierto,
  tipoInicial = 'carro',
  tiposDisponibles,
  sesionId,
  usuario,
  inicioCicloSemaforo,
  onCerrar,
  onRegistrarEvento
}) => {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoVehiculo>(tipoInicial);
  const [guardando, setGuardando] = useState(false);
  const [ahoraMs, setAhoraMs] = useState(() => Date.now());

  // Actualizar segundero en vivo mientras el modal está abierto
  useEffect(() => {
    if (!abierto) return;
    const interval = setInterval(() => {
      setAhoraMs(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, [abierto]);

  if (!abierto) return null;

  const estadoSemaforo = calcularEstadoSemaforo(ahoraMs, inicioCicloSemaforo);
  const infoFase = obtenerInfoFase(estadoSemaforo.fase);

  // Filtrar tipos de vehículos motorizados (no peatón)
  const listaOpciones = (tiposDisponibles && tiposDisponibles.length > 0)
    ? tiposDisponibles.filter((t) => t !== 'peaton')
    : LISTA_TIPOS_VEHICULOS.filter((t) => t !== 'peaton');

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const ahora = Date.now();
      const ahoraIso = new Date(ahora).toISOString();

      // Cálculo automático de la fase semafórica en el instante exacto del cruce
      const estadoCruce = calcularEstadoSemaforo(ahora, inicioCicloSemaforo);
      const categoriaSalida = mapearFaseACategoria(estadoCruce.fase);

      const nuevoEvento: Omit<EventoConteo, 'id'> = {
        sesionId,
        usuario,
        tipoVehiculo: tipoSeleccionado,
        tipoRegistro: 'salida_cola',
        horaEntradaCola: ahoraIso,
        horaLlegaServidor: ahoraIso,
        horaSalida: ahoraIso,
        tiempoEnColaSeg: 0,
        tiempoEnServidorSeg: 0,
        tiempoTotalSeg: 0,
        duracionEsperaSeg: 0,
        faseCruce: estadoCruce.fase,
        segundoEnCiclo: estadoCruce.segundoEnCiclo,
        numeroCiclo: estadoCruce.numeroCiclo,
        categoriaSalida,
        esFlujoLibre: true,
        timestampCreacion: ahora
      };

      await onRegistrarEvento(nuevoEvento);
      onCerrar();
    } catch (err) {
      console.error('Error al registrar cruce directo:', err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative my-6">
        <button
          type="button"
          onClick={onCerrar}
          disabled={guardando}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Registrar Cruce Directo (Flujo Libre)
            </h3>
            <p className="text-xs text-slate-400">
              Vehículo sin detención en cola ni en el semáforo.
            </p>
          </div>
        </div>

        <form onSubmit={handleConfirmar} className="space-y-4">
          {/* 1. Selección del Tipo de Vehículo */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              1. Tipo de Vehículo:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {listaOpciones.map((t) => {
                const info = TIPOS_VEHICULOS[t];
                const seleccionado = tipoSeleccionado === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoSeleccionado(t)}
                    className={`touch-btn p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      seleccionado
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md ring-1 ring-blue-500'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-2xl select-none">{info.emoji}</span>
                    <span className="text-xs font-bold">{info.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Visualización Automática de Fase Semafórica (96s) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              2. Fase Semafórica (Determinación Automática):
            </label>
            <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
              estadoSemaforo.sincronizado
                ? estadoSemaforo.fase === 'verde'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : estadoSemaforo.fase === 'amarillo'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-slate-950/70 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none">{infoFase.emoji}</span>
                <div>
                  <div className="text-xs font-black uppercase">
                    Fase Actual: {infoFase.etiqueta}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {estadoSemaforo.sincronizado
                      ? `Segundo ${estadoSemaforo.segundoEnCiclo} / ${DURACION_CICLO_SEG}s • Ciclo #${estadoSemaforo.numeroCiclo}`
                      : 'Semáforo sin sincronizar en la sesión'}
                  </div>
                </div>
              </div>

              {estadoSemaforo.sincronizado && (
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 block uppercase">Resta</span>
                  <span className="text-base font-black">{estadoSemaforo.segundosRestantesFase}s</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              * Ya no requieres clasificar verde/rojo. Se registrará la fase exacta en el instante en que confirmes.
            </p>
          </div>

          {/* Resumen de tiempos teóricos (Flujo libre: 0 s) */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Tiempo en cola:</span>
              <strong className="text-slate-300 font-mono">0 s</strong>
            </div>
            <div className="flex justify-between">
              <span>Tiempo en servidor:</span>
              <strong className="text-slate-300 font-mono">0 s</strong>
            </div>
            <div className="flex justify-between">
              <span>Tiempo total de espera:</span>
              <strong className="text-emerald-400 font-mono font-bold">0 s (Flujo libre)</strong>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className="touch-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="touch-btn px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{guardando ? 'Guardando...' : 'Confirmar Cruce Directo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
