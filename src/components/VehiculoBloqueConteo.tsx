import React, { useState } from 'react';
import {
  Clock,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  TriangleAlert,
  Undo2,
  Users,
  Timer,
  LogIn,
  AlertCircle
} from 'lucide-react';
import type { TipoVehiculo, EventoConteo, CategoriaSalidaVehiculo, MovimientoGiro, VehiculoEnServidor } from '../types/conteo';
import { TIPOS_VEHICULOS } from '../types/conteo';

interface VehiculoBloqueConteoProps {
  tipo: TipoVehiculo;
  sesionId: string;
  usuario: string;
  colaMemoria: number[];
  servidorMemoria?: VehiculoEnServidor[];
  onActualizarCola: (nuevaCola: number[]) => void;
  onActualizarServidor?: (nuevoServidor: VehiculoEnServidor[]) => void;
  onRegistrarEvento: (nuevoEvento: Omit<EventoConteo, 'id'>) => Promise<void>;
  eventosDelTipo: EventoConteo[];
}

interface UltimaEsperaDetalle {
  cola: number;
  servidor: number;
  total: number;
}

export const VehiculoBloqueConteo: React.FC<VehiculoBloqueConteoProps> = ({
  tipo,
  sesionId,
  usuario,
  colaMemoria,
  servidorMemoria = [],
  onActualizarCola,
  onActualizarServidor,
  onRegistrarEvento,
  eventosDelTipo
}) => {
  const [ultimaEspera, setUltimaEspera] = useState<UltimaEsperaDetalle | null>(null);
  const [animandoEntrada, setAnimandoEntrada] = useState(false);
  const [animandoServidor, setAnimandoServidor] = useState(false);
  const info = TIPOS_VEHICULOS[tipo];

  // Cálculo de totales a partir de los eventos guardados en Firestore
  const entradasCola = eventosDelTipo.filter((e) => e.tipoRegistro === 'entrada_cola');
  const llegadasServidor = eventosDelTipo.filter((e) => e.tipoRegistro === 'llega_servidor');
  const salidas = eventosDelTipo.filter((e) => e.tipoRegistro === 'salida_cola');

  const totalSalidas = salidas.length;
  const countRespeta = salidas.filter((e) => e.categoriaSalida === 'respeta').length;
  const countSeVuela = salidas.filter((e) => e.categoriaSalida === 'se_vuela').length;

  // Contador "En cola ahora: N"
  const enCola = entradasCola.length > 0
    ? Math.max(0, entradasCola.length - llegadasServidor.length)
    : colaMemoria.length;

  // Contador "En servidor ahora: M"
  const enServidor = llegadasServidor.length > 0
    ? Math.max(0, llegadasServidor.length - salidas.length)
    : servidorMemoria.length;

  // Estadísticas de tiempos de espera desglosados
  const esperasCola = salidas
    .map((e) => e.tiempoEnColaSeg)
    .filter((d): d is number => typeof d === 'number');

  const esperasServidor = salidas
    .map((e) => e.tiempoEnServidorSeg)
    .filter((d): d is number => typeof d === 'number');

  const esperasTotal = salidas
    .map((e) => e.tiempoTotalSeg ?? e.duracionEsperaSeg)
    .filter((d): d is number => typeof d === 'number');

  const promedioCola = esperasCola.length > 0
    ? (esperasCola.reduce((a, b) => a + b, 0) / esperasCola.length).toFixed(1)
    : '0';

  const promedioServidor = esperasServidor.length > 0
    ? (esperasServidor.reduce((a, b) => a + b, 0) / esperasServidor.length).toFixed(1)
    : '0';

  const promedioTotal = esperasTotal.length > 0
    ? (esperasTotal.reduce((a, b) => a + b, 0) / esperasTotal.length).toFixed(1)
    : '0';

  // Validación de movimientos contra salidas acumuladas
  const giros = eventosDelTipo.filter((e) => e.tipoRegistro === 'movimiento');
  const totalGiros = giros.length;
  const countRecto = giros.filter((e) => e.movimiento === 'recto').length;
  const countIzquierda = giros.filter((e) => e.movimiento === 'izquierda').length;
  const countDerecha = giros.filter((e) => e.movimiento === 'derecha').length;

  const movimientosHabilitados = totalSalidas > 0 && totalGiros < totalSalidas;
  const girosPendientes = Math.max(0, totalSalidas - totalGiros);

  const vibrar = (duracion = 40) => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(duracion);
      } catch {
        // Ignorar
      }
    }
  };

  // 1. Entra a la cola (FIFO)
  const handleEntraCola = async () => {
    vibrar();
    const ahoraMs = Date.now();
    const ahoraIso = new Date(ahoraMs).toISOString();

    const nuevaCola = [...colaMemoria, ahoraMs];
    onActualizarCola(nuevaCola);

    setAnimandoEntrada(true);
    setTimeout(() => setAnimandoEntrada(false), 250);

    // Guardar evento de entrada a cola en Firestore
    const nuevoEvento: Omit<EventoConteo, 'id'> = {
      sesionId,
      usuario,
      tipoVehiculo: tipo,
      tipoRegistro: 'entrada_cola',
      horaEntradaCola: ahoraIso,
      timestampCreacion: ahoraMs
    };

    await onRegistrarEvento(nuevoEvento);
  };

  // 2. Llega al servidor (semáforo)
  const handleLlegaServidor = async () => {
    if (enCola <= 0) return;

    vibrar(35);
    const ahoraMs = Date.now();
    const ahoraIso = new Date(ahoraMs).toISOString();

    let horaEntradaColaMs = ahoraMs;

    if (colaMemoria.length > 0) {
      horaEntradaColaMs = colaMemoria[0];
      const nuevaCola = colaMemoria.slice(1);
      onActualizarCola(nuevaCola);
    } else if (entradasCola.length > llegadasServidor.length) {
      const entradaCorresp = entradasCola[llegadasServidor.length];
      horaEntradaColaMs = entradaCorresp.timestampCreacion;
    }

    const tiempoEnColaSeg = Math.max(0, Math.round((ahoraMs - horaEntradaColaMs) / 1000));
    const horaEntradaColaIso = new Date(horaEntradaColaMs).toISOString();

    if (onActualizarServidor) {
      onActualizarServidor([
        ...servidorMemoria,
        { horaEntradaCola: horaEntradaColaMs, horaLlegaServidor: ahoraMs }
      ]);
    }

    setAnimandoServidor(true);
    setTimeout(() => setAnimandoServidor(false), 250);

    // Guardar evento intermedio en Firestore
    const nuevoEvento: Omit<EventoConteo, 'id'> = {
      sesionId,
      usuario,
      tipoVehiculo: tipo,
      tipoRegistro: 'llega_servidor',
      horaEntradaCola: horaEntradaColaIso,
      horaLlegaServidor: ahoraIso,
      tiempoEnColaSeg,
      timestampCreacion: ahoraMs
    };

    await onRegistrarEvento(nuevoEvento);
  };

  // 3. Salida: Respeta (verde) o Se vuela (rojo)
  const handleSalidaCola = async (categoria: CategoriaSalidaVehiculo) => {
    vibrar(45);
    const ahoraMs = Date.now();
    const ahoraIso = new Date(ahoraMs).toISOString();

    let horaEntradaColaIso = ahoraIso;
    let horaLlegaServidorIso = ahoraIso;
    let tiempoEnColaSeg = 0;
    let tiempoEnServidorSeg = 0;
    let tiempoTotalSeg = 0;

    // Caso A: Hay vehículos esperando en servidor (flujo normal M > 0)
    if (servidorMemoria.length > 0) {
      const item = servidorMemoria[0];
      if (onActualizarServidor) {
        onActualizarServidor(servidorMemoria.slice(1));
      }
      horaEntradaColaIso = new Date(item.horaEntradaCola).toISOString();
      horaLlegaServidorIso = new Date(item.horaLlegaServidor).toISOString();
      tiempoEnColaSeg = Math.max(0, Math.round((item.horaLlegaServidor - item.horaEntradaCola) / 1000));
      tiempoEnServidorSeg = Math.max(0, Math.round((ahoraMs - item.horaLlegaServidor) / 1000));
      tiempoTotalSeg = Math.max(0, Math.round((ahoraMs - item.horaEntradaCola) / 1000));
    } else if (llegadasServidor.length > salidas.length) {
      // Reconciliación offline / recarga
      const llegadaCorresp = llegadasServidor[salidas.length];
      const tLlegada = llegadaCorresp.timestampCreacion;
      const tEntrada = llegadaCorresp.horaEntradaCola
        ? new Date(llegadaCorresp.horaEntradaCola).getTime()
        : tLlegada;
      horaEntradaColaIso = new Date(tEntrada).toISOString();
      horaLlegaServidorIso = new Date(tLlegada).toISOString();
      tiempoEnColaSeg = Math.max(0, Math.round((tLlegada - tEntrada) / 1000));
      tiempoEnServidorSeg = Math.max(0, Math.round((ahoraMs - tLlegada) / 1000));
      tiempoTotalSeg = Math.max(0, Math.round((ahoraMs - tEntrada) / 1000));
    } else if (enCola > 0) {
      // Caso B: M = 0 pero N > 0 (vehículo cruzó directamente desde la cola sin registrar paso por servidor)
      let tEntrada = ahoraMs;
      if (colaMemoria.length > 0) {
        tEntrada = colaMemoria[0];
        onActualizarCola(colaMemoria.slice(1));
      } else if (entradasCola.length > salidas.length) {
        tEntrada = entradasCola[salidas.length].timestampCreacion;
      }
      horaEntradaColaIso = new Date(tEntrada).toISOString();
      horaLlegaServidorIso = ahoraIso;
      tiempoEnColaSeg = Math.max(0, Math.round((ahoraMs - tEntrada) / 1000));
      tiempoEnServidorSeg = 0;
      tiempoTotalSeg = tiempoEnColaSeg;
    } else {
      // Caso C: M = 0 y N = 0 (flujo libre directo sin detenerse)
      horaEntradaColaIso = ahoraIso;
      horaLlegaServidorIso = ahoraIso;
      tiempoEnColaSeg = 0;
      tiempoEnServidorSeg = 0;
      tiempoTotalSeg = 0;
    }

    setUltimaEspera({
      cola: tiempoEnColaSeg,
      servidor: tiempoEnServidorSeg,
      total: tiempoTotalSeg
    });

    // Guardar evento completo en Firestore
    const nuevoEvento: Omit<EventoConteo, 'id'> = {
      sesionId,
      usuario,
      tipoVehiculo: tipo,
      tipoRegistro: 'salida_cola',
      horaEntradaCola: horaEntradaColaIso,
      horaLlegaServidor: horaLlegaServidorIso,
      horaSalida: ahoraIso,
      tiempoEnColaSeg,
      tiempoEnServidorSeg,
      tiempoTotalSeg,
      duracionEsperaSeg: tiempoTotalSeg,
      categoriaSalida: categoria,
      timestampCreacion: ahoraMs
    };

    await onRegistrarEvento(nuevoEvento);
  };

  // 4. Giros independientes
  const handleMovimiento = async (giro: MovimientoGiro) => {
    if (!movimientosHabilitados) return;

    vibrar();
    const ahoraMs = Date.now();
    const nuevoEvento: Omit<EventoConteo, 'id'> = {
      sesionId,
      usuario,
      tipoVehiculo: tipo,
      tipoRegistro: 'movimiento',
      movimiento: giro,
      timestampCreacion: ahoraMs
    };

    await onRegistrarEvento(nuevoEvento);
  };

  // Deshacer última entrada a cola
  const handleDeshacerEntradaCola = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (colaMemoria.length === 0) return;
    const nuevaCola = colaMemoria.slice(0, -1);
    onActualizarCola(nuevaCola);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition hover:border-slate-700/80">
      <div>
        {/* Encabezado del Bloque y Contadores en Paralelo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2.5">
          <div className="flex items-center gap-3">
            <span className="text-3xl select-none leading-none" role="img" aria-label={info.nombre}>
              {info.emoji}
            </span>
            <div>
              <h3 className={`text-base font-extrabold tracking-tight ${info.color}`}>
                {info.nombre}
              </h3>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                {info.subtitulo}
              </p>
            </div>
          </div>

          {/* CONTADORES DOBLES EN PARALELO: EN COLA (N) Y EN SERVIDOR (M) */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Contador 1: En cola (N) */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono transition-all ${
                enCola > 0
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[9px] uppercase font-bold text-slate-400">En cola</span>
                <span className="text-base font-black text-white mt-0.5">{enCola}</span>
              </div>
            </div>

            {/* Contador 2: En servidor (M) */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono transition-all ${
                enServidor > 0
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              <Timer className="w-3.5 h-3.5 text-cyan-400" />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[9px] uppercase font-bold text-slate-400">En semáforo</span>
                <span className="text-base font-black text-white mt-0.5">{enServidor}</span>
              </div>
            </div>

            {colaMemoria.length > 0 && (
              <button
                type="button"
                onClick={handleDeshacerEntradaCola}
                title="Deshacer último toque a la cola"
                className="touch-btn text-[11px] text-slate-400 hover:text-white px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1 transition"
              >
                <Undo2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Deshacer</span>
              </button>
            )}
          </div>
        </div>

        {/* SECUENCIA DE ACCIÓN: 1. ENTRA A COLA → 2. LLEGA AL SERVIDOR → 3. CRUZA */}
        <div className="mt-3.5 space-y-2.5">
          {/* Fila de Paso 1 y Paso 2 */}
          <div className="grid grid-cols-2 gap-2">
            {/* BOTÓN 1: Entra a la cola */}
            <button
              type="button"
              onClick={handleEntraCola}
              className={`touch-btn py-3 px-2.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide uppercase transition-all flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer ${
                animandoEntrada
                  ? 'bg-amber-400 text-slate-950 scale-95'
                  : 'bg-gradient-to-br from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 shadow-amber-600/20 active:scale-95'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 shrink-0 fill-slate-950/20" />
                <span>1. Entra cola</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-950/20 px-2 py-0.5 rounded-md">
                +1 fila
              </span>
            </button>

            {/* BOTÓN 2: Llega al servidor (semáforo) */}
            <button
              type="button"
              disabled={enCola === 0}
              onClick={handleLlegaServidor}
              className={`touch-btn py-3 px-2.5 rounded-2xl border font-bold text-xs sm:text-sm tracking-wide uppercase transition-all flex flex-col items-center justify-center gap-1 shadow-md ${
                enCola > 0
                  ? animandoServidor
                    ? 'bg-cyan-400 text-slate-950 scale-95 border-cyan-400'
                    : 'bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white shadow-cyan-600/20 active:scale-95 border-cyan-500/40 cursor-pointer'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <LogIn className="w-4 h-4 shrink-0" />
                <span>2. Al semáforo</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                enCola > 0 ? 'bg-black/20 text-cyan-200' : 'text-slate-600'
              }`}>
                Pasa al frente
              </span>
            </button>
          </div>

          {/* BOTONES 3: Cruza en Verde (Respeta) / Cruza en Rojo (Se Vuela) */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              {/* Cruza en Verde */}
              <button
                type="button"
                onClick={() => handleSalidaCola('respeta')}
                className="touch-btn py-3 px-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-md shadow-emerald-700/20 active:scale-95 border-emerald-500/30 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <CircleCheck className="w-5 h-5 shrink-0 text-emerald-200" />
                  <span>3. Cruza verde</span>
                </div>
                <span className="text-[10px] font-bold tracking-wide uppercase text-emerald-200/90">
                  (Respeta)
                </span>
              </button>

              {/* Cruza en Rojo */}
              <button
                type="button"
                onClick={() => handleSalidaCola('se_vuela')}
                className="touch-btn py-3 px-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-md shadow-rose-700/20 active:scale-95 border-rose-500/30 cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                  <TriangleAlert className="w-5 h-5 shrink-0 text-rose-200" />
                  <span>3. Cruza rojo</span>
                </div>
                <span className="text-[10px] font-bold tracking-wide uppercase text-rose-200/90">
                  (Se vuela)
                </span>
              </button>
            </div>

            {/* Aviso dinámico sobre el estado actual del semáforo/servidor */}
            <div className="text-[11px] text-center font-medium pt-0.5">
              {enServidor > 0 ? (
                <span className="text-cyan-400">
                  Descuenta del semáforo ({enServidor} esperando frente al semáforo).
                </span>
              ) : enCola > 0 ? (
                <span className="text-amber-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                  <span>Hay {enCola} en cola sin pasar a &quot;Al semáforo&quot; (se cruzará directo).</span>
                </span>
              ) : (
                <span className="text-slate-500">
                  Flujo libre directo: cruce sin detenerse (0s en los tres tiempos).
                </span>
              )}
            </div>
          </div>
        </div>

        {/* MÉTRICAS DE SALIDA */}
        <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 text-center font-mono">
          <div>
            <div className="text-[10px] text-slate-400 font-sans uppercase">Total Salidas</div>
            <div className="text-base font-extrabold text-white mt-0.5">{totalSalidas}</div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 font-sans uppercase">Respeta (V)</div>
            <div className="text-base font-extrabold text-emerald-400 mt-0.5">{countRespeta}</div>
          </div>
          <div>
            <div className="text-[10px] text-rose-400 font-sans uppercase">Se vuela (R)</div>
            <div className="text-base font-extrabold text-rose-400 mt-0.5">{countSeVuela}</div>
          </div>
        </div>

        {/* TIEMPOS DE SERVICIO Y ESPERA (DESGLOSE TEORÍA DE COLAS) */}
        <div className="mt-2.5 bg-slate-800/40 p-2.5 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 text-slate-400">
              <Timer className="w-3.5 h-3.5 text-blue-400" />
              <span>Promedios:</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span title="Tiempo en cola">
                Cola: <strong className="text-amber-300">{promedioCola}s</strong>
              </span>
              <span>•</span>
              <span title="Tiempo en semáforo/servidor">
                Semáf: <strong className="text-cyan-300">{promedioServidor}s</strong>
              </span>
              <span>•</span>
              <span title="Tiempo total">
                Total: <strong className="text-white">{promedioTotal}s</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 font-mono">
            <span className="text-slate-400 font-sans">Último cruce:</span>
            {ultimaEspera !== null ? (
              <span className="text-slate-200">
                Cola <strong className="text-amber-300">{ultimaEspera.cola}s</strong> +{' '}
                Semáf <strong className="text-cyan-300">{ultimaEspera.servidor}s</strong> ={' '}
                <strong className="text-emerald-300 font-bold">{ultimaEspera.total}s</strong>
              </span>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </div>
        </div>
      </div>

      {/* GIROS / MOVIMIENTOS INDEPENDIENTES */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Giros / Movimientos ({totalGiros}/{totalSalidas})
          </span>
          {movimientosHabilitados && (
            <span className="text-[10px] font-mono font-bold text-blue-400">
              Pendientes: {girosPendientes}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            disabled={!movimientosHabilitados}
            onClick={() => handleMovimiento('izquierda')}
            className={`touch-btn py-2.5 px-1 rounded-xl border flex flex-col items-center justify-center transition ${
              movimientosHabilitados
                ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200 active:scale-95 cursor-pointer'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-600 cursor-not-allowed opacity-40'
            }`}
          >
            <div className="flex items-center gap-1 text-xs font-bold">
              <ArrowLeft className={`w-5 h-5 shrink-0 ${movimientosHabilitados ? 'text-blue-400' : 'text-slate-600'}`} />
              <span>Izq</span>
            </div>
            <span className={`text-xs font-mono font-bold mt-0.5 ${movimientosHabilitados ? 'text-blue-300' : 'text-slate-600'}`}>
              {countIzquierda}
            </span>
          </button>

          <button
            type="button"
            disabled={!movimientosHabilitados}
            onClick={() => handleMovimiento('recto')}
            className={`touch-btn py-2.5 px-1 rounded-xl border flex flex-col items-center justify-center transition ${
              movimientosHabilitados
                ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200 active:scale-95 cursor-pointer'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-600 cursor-not-allowed opacity-40'
            }`}
          >
            <div className="flex items-center gap-1 text-xs font-bold">
              <ArrowUp className={`w-5 h-5 shrink-0 ${movimientosHabilitados ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Recto</span>
            </div>
            <span className={`text-xs font-mono font-bold mt-0.5 ${movimientosHabilitados ? 'text-emerald-300' : 'text-slate-600'}`}>
              {countRecto}
            </span>
          </button>

          <button
            type="button"
            disabled={!movimientosHabilitados}
            onClick={() => handleMovimiento('derecha')}
            className={`touch-btn py-2.5 px-1 rounded-xl border flex flex-col items-center justify-center transition ${
              movimientosHabilitados
                ? 'bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-slate-200 active:scale-95 cursor-pointer'
                : 'bg-slate-900/60 border-slate-800/80 text-slate-600 cursor-not-allowed opacity-40'
            }`}
          >
            <div className="flex items-center gap-1 text-xs font-bold">
              <ArrowRight className={`w-5 h-5 shrink-0 ${movimientosHabilitados ? 'text-purple-400' : 'text-slate-600'}`} />
              <span>Der</span>
            </div>
            <span className={`text-xs font-mono font-bold mt-0.5 ${movimientosHabilitados ? 'text-purple-300' : 'text-slate-600'}`}>
              {countDerecha}
            </span>
          </button>
        </div>

        {/* Texto de ayuda sobre estado de giros */}
        <div className="mt-2 text-center">
          {totalSalidas === 0 ? (
            <p className="text-[10px] text-slate-500">
              Deben cruzar vehículos antes de registrar giros.
            </p>
          ) : !movimientosHabilitados ? (
            <p className="text-[10px] text-amber-400/90 font-medium">
              Ya se registraron movimientos para todos los vehículos que cruzaron.
            </p>
          ) : (
            <p className="text-[10px] text-blue-400 font-medium">
              Registra el giro correspondiente a los vehículos que ya cruzaron.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
