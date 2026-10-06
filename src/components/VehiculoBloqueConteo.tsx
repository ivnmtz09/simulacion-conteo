import React, { useState } from 'react';
import {
  Clock,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Undo2,
  Users,
  Timer,
  LogIn,
  AlertCircle,
  Zap
} from 'lucide-react';
import type { TipoVehiculo, EventoConteo, CategoriaSalidaVehiculo, MovimientoGiro, VehiculoEnServidor, FaseSemaforo } from '../types/conteo';
import { TIPOS_VEHICULOS } from '../types/conteo';
import { CruceDirectoModal } from './CruceDirectoModal';
import { db, doc, updateDoc } from '../lib/firebase';
import { calcularEstadoSemaforo, mapearFaseACategoria } from '../lib/semaforoUtils';

interface VehiculoBloqueConteoProps {
  tipo: TipoVehiculo;
  sesionId: string;
  usuario: string;
  inicioCicloSemaforo?: number | null;
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

interface UltimoCruceResultado {
  fase: FaseSemaforo | null;
  segundoEnCiclo: number | null;
  numeroCiclo: number | null;
  categoria: CategoriaSalidaVehiculo;
}

export const VehiculoBloqueConteo: React.FC<VehiculoBloqueConteoProps> = ({
  tipo,
  sesionId,
  usuario,
  inicioCicloSemaforo,
  colaMemoria: _colaMemoria,
  servidorMemoria: _servidorMemoria = [],
  onActualizarCola: _onActualizarCola,
  onActualizarServidor: _onActualizarServidor,
  onRegistrarEvento,
  eventosDelTipo
}) => {
  const [ultimaEspera, setUltimaEspera] = useState<UltimaEsperaDetalle | null>(null);
  const [ultimoCruceResultado, setUltimoCruceResultado] = useState<UltimoCruceResultado | null>(null);
  const [animandoEntrada, setAnimandoEntrada] = useState(false);
  const [animandoServidor, setAnimandoServidor] = useState(false);
  const [modalCruceDirectoAbierto, setModalCruceDirectoAbierto] = useState(false);
  const info = TIPOS_VEHICULOS[tipo];

  // Cálculo de eventos válidos guardados en Firestore (excluyendo papelera)
  const entradasCola = eventosDelTipo.filter((e) => e.tipoRegistro === 'entrada_cola' && !e.enPapelera);
  const llegadasServidor = eventosDelTipo.filter((e) => e.tipoRegistro === 'llega_servidor' && !e.enPapelera);
  const salidas = eventosDelTipo.filter((e) => e.tipoRegistro === 'salida_cola' && !e.enPapelera);

  // Separar salidas que pasaron por servidor de los cruces directos en flujo libre
  const salidasCola = salidas.filter((e) => !e.esFlujoLibre);

  const totalSalidas = salidas.length;

  // Desglose por fases semafóricas calculadas automáticamente (con retrocompatibilidad)
  const countVerde = salidas.filter((e) => e.faseCruce === 'verde' || (!e.faseCruce && e.categoriaSalida === 'respeta')).length;
  const countAmarillo = salidas.filter((e) => e.faseCruce === 'amarillo').length;
  const countRojo = salidas.filter((e) => e.faseCruce === 'rojo' || (!e.faseCruce && e.categoriaSalida === 'se_vuela')).length;

  // Contador "En cola ahora: N" (sincronizado reactivamente desde Firestore para todo el equipo)
  const enCola = Math.max(0, entradasCola.length - llegadasServidor.length);

  // Contador "En servidor ahora: M" (sincronizado reactivamente desde Firestore para todo el equipo)
  const enServidor = Math.max(0, llegadasServidor.length - salidasCola.length);

  // Estadísticas de tiempos de espera desglosados (excluye flujo libre para no alterar los promedios de espera real)
  const esperasCola = salidasCola
    .map((e) => e.tiempoEnColaSeg)
    .filter((d): d is number => typeof d === 'number');

  const esperasServidor = salidasCola
    .map((e) => e.tiempoEnServidorSeg)
    .filter((d): d is number => typeof d === 'number');

  const esperasTotal = salidasCola
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
  const giros = eventosDelTipo.filter((e) => e.tipoRegistro === 'movimiento' && !e.enPapelera);
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

  // 1. Entra a la cola (FIFO colaborativo)
  const handleEntraCola = async () => {
    vibrar();
    const ahoraMs = Date.now();
    const ahoraIso = new Date(ahoraMs).toISOString();

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

    // Toma el vehículo más antiguo en espera en cola (FIFO)
    const entradaCorresp = entradasCola[llegadasServidor.length];
    const horaEntradaColaIso = entradaCorresp?.horaEntradaCola || new Date(entradaCorresp?.timestampCreacion || ahoraMs).toISOString();
    const horaEntradaColaMs = new Date(horaEntradaColaIso).getTime();

    const tiempoEnColaSeg = Math.max(0, Math.round((ahoraMs - horaEntradaColaMs) / 1000));

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

  // 3. Cruza vehículo — Estrictamente solo si M >= 1 (Cálculo automático de fase semafórica de 93s)
  const handleSalidaCola = async () => {
    if (enServidor <= 0) return;

    vibrar(45);
    const ahoraMs = Date.now();
    const ahoraIso = new Date(ahoraMs).toISOString();

    // Tomar el vehículo más antiguo actualmente en el servidor (FIFO)
    const llegadaCorresp = llegadasServidor[salidasCola.length];
    const tLlegada = llegadaCorresp
      ? new Date(llegadaCorresp.horaLlegaServidor || llegadaCorresp.timestampCreacion).getTime()
      : ahoraMs;
    const tEntrada = llegadaCorresp && llegadaCorresp.horaEntradaCola
      ? new Date(llegadaCorresp.horaEntradaCola).getTime()
      : tLlegada;

    const horaEntradaColaIso = new Date(tEntrada).toISOString();
    const horaLlegaServidorIso = new Date(tLlegada).toISOString();

    // Cálculo matemático exacto de teoría de colas conservado sin alteraciones
    const tiempoEnColaSeg = Math.max(0, Math.round((tLlegada - tEntrada) / 1000));
    const tiempoEnServidorSeg = Math.max(0, Math.round((ahoraMs - tLlegada) / 1000));
    const tiempoTotalSeg = Math.max(0, Math.round((ahoraMs - tEntrada) / 1000));

    // Determinación automática de la fase del semáforo según el ciclo de 93s
    const estadoSemaforo = calcularEstadoSemaforo(ahoraMs, inicioCicloSemaforo);
    const categoria = mapearFaseACategoria(estadoSemaforo.fase);

    setUltimaEspera({
      cola: tiempoEnColaSeg,
      servidor: tiempoEnServidorSeg,
      total: tiempoTotalSeg
    });

    setUltimoCruceResultado({
      fase: estadoSemaforo.fase,
      segundoEnCiclo: estadoSemaforo.segundoEnCiclo,
      numeroCiclo: estadoSemaforo.numeroCiclo,
      categoria
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
      faseCruce: estadoSemaforo.fase,
      segundoEnCiclo: estadoSemaforo.segundoEnCiclo,
      numeroCiclo: estadoSemaforo.numeroCiclo,
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

  // Deshacer última entrada a cola (sincronizado con Firestore para todo el equipo)
  const handleDeshacerEntradaCola = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (enCola <= 0) return;
    const ultimoEntrada = entradasCola[entradasCola.length - 1];
    if (ultimoEntrada && ultimoEntrada.id) {
      try {
        await updateDoc(doc(db, 'eventos', ultimoEntrada.id), { enPapelera: true });
      } catch (err) {
        console.error('Error al deshacer entrada a cola en Firestore:', err);
      }
    }
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

            {enCola > 0 && (
              <button
                type="button"
                onClick={handleDeshacerEntradaCola}
                title="Deshacer última entrada a la cola"
                className="touch-btn text-[11px] text-slate-400 hover:text-white px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1 transition cursor-pointer"
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

          {/* BOTÓN 3: UN SOLO BOTÓN "3. CRUZA" — DESHABILITADO SI M = 0 */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={enServidor === 0}
              onClick={handleSalidaCola}
              className={`touch-btn w-full py-3.5 px-4 rounded-2xl border flex items-center justify-center gap-2.5 transition-all shadow-md ${
                enServidor > 0
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white shadow-emerald-700/25 active:scale-95 border-emerald-400/40 cursor-pointer font-black text-sm'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-40 font-bold text-sm'
              }`}
            >
              <CircleCheck className={`w-5 h-5 shrink-0 ${enServidor > 0 ? 'text-white' : 'text-slate-600'}`} />
              <span className="tracking-wide uppercase">3. Cruza vehículo</span>
            </button>

            {/* FEEDBACK VISUAL BREVE TRAS EL CRUCE */}
            {ultimoCruceResultado && (
              <div className={`p-2 rounded-xl border text-xs flex items-center justify-between transition-all animate-in fade-in ${
                ultimoCruceResultado.fase === 'verde'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : ultimoCruceResultado.fase === 'amarillo'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : ultimoCruceResultado.fase === 'rojo'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300'
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  <span>{ultimoCruceResultado.fase === 'verde' ? '🟢' : ultimoCruceResultado.fase === 'amarillo' ? '🟡' : ultimoCruceResultado.fase === 'rojo' ? '🔴' : '⚪'}</span>
                  <span>
                    Cruzó en {ultimoCruceResultado.fase ? ultimoCruceResultado.fase.toUpperCase() : 'Sin sincronizar'}
                  </span>
                </div>
                {ultimoCruceResultado.segundoEnCiclo !== null && (
                  <span className="font-mono text-[11px] text-slate-300">
                    Seg {ultimoCruceResultado.segundoEnCiclo}s (Ciclo #{ultimoCruceResultado.numeroCiclo})
                  </span>
                )}
              </div>
            )}

            {/* BOTÓN INDEPENDIENTE: REGISTRAR CRUCE DIRECTO (SIN COLA) */}
            <button
              type="button"
              onClick={() => setModalCruceDirectoAbierto(true)}
              className="touch-btn w-full py-2 px-3 rounded-xl border border-amber-500/40 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-98"
              title="Registrar cruce de vehículo en flujo libre sin detenerse en cola ni en semáforo"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span>Registrar cruce directo (flujo libre)</span>
            </button>

            {/* Aviso dinámico sobre el estado actual del semáforo/servidor */}
            <div className="text-[11px] text-center font-medium pt-0.5">
              {enServidor > 0 ? (
                <span className="text-cyan-400 font-semibold">
                  Hay {enServidor} vehículo(s) en semáforo (Paso 3 habilitado).
                </span>
              ) : enCola > 0 ? (
                <span className="text-amber-400 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 inline shrink-0" />
                  <span>Hay {enCola} en cola. Pásalos a &quot;2. Al semáforo&quot; para habilitar el cruce.</span>
                </span>
              ) : (
                <span className="text-slate-500">
                  Semáforo vacío (M = 0). Para flujo libre sin detención, usa &quot;Cruce directo&quot;.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* MÉTRICAS DE SALIDA DESGLOSADAS POR FASE AUTOMÁTICA */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 bg-slate-950/60 p-2 rounded-2xl border border-slate-800/80 text-center font-mono">
          <div>
            <div className="text-[9px] text-slate-400 font-sans uppercase font-bold">Total</div>
            <div className="text-base font-extrabold text-white mt-0.5">{totalSalidas}</div>
          </div>
          <div>
            <div className="text-[9px] text-emerald-400 font-sans uppercase font-bold">Verde</div>
            <div className="text-base font-extrabold text-emerald-400 mt-0.5">{countVerde}</div>
          </div>
          <div>
            <div className="text-[9px] text-amber-400 font-sans uppercase font-bold">Amarillo</div>
            <div className="text-base font-extrabold text-amber-400 mt-0.5">{countAmarillo}</div>
          </div>
          <div>
            <div className="text-[9px] text-rose-400 font-sans uppercase font-bold">Rojo</div>
            <div className="text-base font-extrabold text-rose-400 mt-0.5">{countRojo}</div>
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

          {ultimaEspera && (
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/60 font-mono">
              <span className="text-slate-400 font-sans">Último vehículo:</span>
              <div className="flex items-center gap-2">
                <span>Cola: <strong className="text-amber-400">{ultimaEspera.cola}s</strong></span>
                <span>Semáf: <strong className="text-cyan-400">{ultimaEspera.servidor}s</strong></span>
                <span>Total: <strong className="text-white">{ultimaEspera.total}s</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BLOQUE DE MOVIMIENTOS / GIROS INDEPENDIENTES */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>Giros / Maniobras</span>
            {girosPendientes > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {girosPendientes} pendiente{girosPendientes > 1 ? 's' : ''}
              </span>
            )}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {totalGiros} / {totalSalidas} registrados
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* Giro Izquierda */}
          <button
            type="button"
            disabled={!movimientosHabilitados}
            onClick={() => handleMovimiento('izquierda')}
            className={`touch-btn py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              movimientosHabilitados
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-blue-500/50 text-slate-200 cursor-pointer shadow-sm active:scale-95'
                : 'bg-slate-800/30 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center gap-1 font-bold text-xs">
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>Izq</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{countIzquierda}</span>
          </button>

          {/* Movimiento Recto */}
          <button
            type="button"
            disabled={!movimientosHabilitados}
            onClick={() => handleMovimiento('recto')}
            className={`touch-btn py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              movimientosHabilitados
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-blue-500/50 text-slate-200 cursor-pointer shadow-sm active:scale-95'
                : 'bg-slate-800/30 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center gap-1 font-bold text-xs">
              <ArrowUp className="w-4 h-4 text-blue-400" />
              <span>Recto</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{countRecto}</span>
          </button>

          {/* Giro Derecha */}
          <button
            type="button"
            disabled={!movimientosHabilitados}
            onClick={() => handleMovimiento('derecha')}
            className={`touch-btn py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
              movimientosHabilitados
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-blue-500/50 text-slate-200 cursor-pointer shadow-sm active:scale-95'
                : 'bg-slate-800/30 border-slate-800/60 text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <div className="flex items-center gap-1 font-bold text-xs">
              <ArrowRight className="w-4 h-4 text-blue-400" />
              <span>Der</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{countDerecha}</span>
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

      {/* Modal de Cruce Directo (Flujo Libre) */}
      <CruceDirectoModal
        abierto={modalCruceDirectoAbierto}
        tipoInicial={tipo}
        sesionId={sesionId}
        usuario={usuario}
        inicioCicloSemaforo={inicioCicloSemaforo}
        onCerrar={() => setModalCruceDirectoAbierto(false)}
        onRegistrarEvento={onRegistrarEvento}
      />
    </div>
  );
};
